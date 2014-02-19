
$(document).ready(function() {
    // variables for drag/drop
    var selectedNode = null;
    var draggingNode = null;
    // panning variables
    var panSpeed = 200;
    var panBoundary = 20; // Within 20px from edges will pan when dragging.

    var w = 1200,
        h = 3000;
    var newNodeId = 1;

    var root;

    var nodeImageH = 68,
        nodeImageW = 68;
    var newLinkLen = 30;

    var duration = 200;

    var tree = d3.layout.tree().nodeSize([100,180])

    var diagonal = d3.svg.diagonal()
        .source(function(d) {
            return {
                x: d.source.x,
                y: d.source.y + nodeImageH/2 + (d.source.downTextHeight || 0)
            };
        })
        .target(function(d) {
            return {
                x: d.target.x,
                y: d.target.y - nodeImageH/2 - (d.target.topTextHeight || 0)
            };
        });

   function pan(domNode, direction) {
        var speed = panSpeed;
        if (panTimer) {
            clearTimeout(panTimer);
            translateCoords = d3.transform(svgGroup.attr("transform"));
            if (direction == 'left' || direction == 'right') {
                translateX = direction == 'left' ? translateCoords.translate[0] + speed : translateCoords.translate[0] - speed;
                translateY = translateCoords.translate[1];
            } else if (direction == 'up' || direction == 'down') {
                translateX = translateCoords.translate[0];
                translateY = direction == 'up' ? translateCoords.translate[1] + speed : translateCoords.translate[1] - speed;
            }
            scaleX = translateCoords.scale[0];
            scaleY = translateCoords.scale[1];
            scale = zoomListener.scale();
            svgGroup.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
            d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
            zoomListener.scale(zoomListener.scale());
            zoomListener.translate([translateX, translateY]);
            panTimer = setTimeout(function() {
                pan(domNode, speed, direction);
            }, 50);
        }
    }

    // Define the zoom function for the zoomable tree
    function zoom() {
        svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }

    // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
    var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

    function initiateDrag(d, domNode) {
        draggingNode = d;
        d3.select(domNode).select('.ghostCircle').attr('pointer-events', 'none');
        d3.selectAll('.ghostCircle').attr('class', 'ghostCircle show');
        d3.select(domNode).attr('class', 'node activeDrag');

        svgGroup.selectAll("g.node").sort(function(a, b) { // select the parent and sort the path's
            if (a.id != draggingNode.id) return 1; // a is not the hovered element, send "a" to the back
            else return -1; // a is the hovered element, bring "a" to the front
        });
        // if nodes has children, remove the links and nodes
        if (nodes.length > 1) {
            // remove link paths
            links = tree.links(nodes);
            nodePaths = svgGroup.selectAll("path.link")
                .data(links, function(d) {
                    return d.target.id;
                }).remove();
            // remove child nodes
            nodesExit = svgGroup.selectAll("g.node")
                .data(nodes, function(d) {
                    return d.id;
                }).filter(function(d, i) {
                    if (d.id == draggingNode.id) {
                        return false;
                    }
                    return true;
                }).remove();
        }

        // remove parent link
        parentLink = tree.links(tree.nodes(draggingNode.parent));
        svgGroup.selectAll('path.link').filter(function(d, i) {
            if (d.target.id == draggingNode.id) {
                return true;
            }
            return false;
        }).remove();

        dragStarted = null;
    }

    // define the baseSvg, attaching a class for styling and the zoomListener
    var baseSvg = d3.select("#chart-inner").append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("class", "overlay")
        .call(zoomListener);

// Define the drag listeners for drag/drop behaviour of nodes.
    dragListener = d3.behavior.drag()
        .on("dragstart", function(d) {
            if (d == root) {
                return;
            }
            dragStarted = true;
            nodes = tree.nodes(d);
            d3.event.sourceEvent.stopPropagation();
            // it's important that we suppress the mouseover event on the node being dragged. Otherwise it will absorb the mouseover event and the underlying node will not detect it d3.select(this).attr('pointer-events', 'none');
        })
        .on("drag", function(d) {
            if (d == root) {
                return;
            }
            if (dragStarted) {
                domNode = this;
                initiateDrag(d, domNode);
            }

            // get coords of mouseEvent relative to svg container to allow for panning
            relCoords = d3.mouse($('svg').get(0));
            if (relCoords[0] < panBoundary) {
                panTimer = true;
                pan(this, 'left');
            } else if (relCoords[0] > ($('svg').width() - panBoundary)) {

                panTimer = true;
                pan(this, 'right');
            } else if (relCoords[1] < panBoundary) {
                panTimer = true;
                pan(this, 'up');
            } else if (relCoords[1] > ($('svg').height() - panBoundary)) {
                panTimer = true;
                pan(this, 'down');
            } else {
                try {
                    clearTimeout(panTimer);
                } catch (e) {

                }
            }

            d.x = d3.event.x;
            d.y = d3.event.y;

            var node = d3.select(this);
            node.attr("transform", "translate(" + d.x + "," + d.y + ")");
            updateTempConnector();
        }).on("dragend", function(d) {
            if (d == root) {
                return;
            }
            domNode = this;
            if (selectedNode) {
                // now remove the element from the parent, and insert it into the new elements children
                var index = draggingNode.parent.children.indexOf(draggingNode);
                if (index > -1) {
                    draggingNode.parent.children.splice(index, 1);
                }
                if (typeof selectedNode.children !== 'undefined') {
                    selectedNode.children.push(draggingNode);
                } else {
                    selectedNode.children = [];
                    selectedNode.children.push(draggingNode);
                }
                endDrag();
            } else {
                endDrag();
            }
        });

    function endDrag() {
        selectedNode = null;
        d3.selectAll('.ghostCircle').attr('class', 'ghostCircle');
        d3.select(domNode).attr('class', 'node');
        // now restore the mouseover event or we won't be able to drag a 2nd time
        d3.select(domNode).select('.ghostCircle').attr('pointer-events', '');
        updateTempConnector();
        if (draggingNode !== null) {
            update(root);
            draggingNode = null;
        }
    }

    var overCircle = function(d) {
        selectedNode = d;
        updateTempConnector();
    };
    var outCircle = function(d) {
        selectedNode = null;
        updateTempConnector();
    };

    // Function to update the temporary connector indicating dragging affiliation
    var updateTempConnector = function() {
        var data = [];
        if (draggingNode !== null && selectedNode !== null) {
            // have to flip the source coordinates since we did this for the existing connectors on the original tree
            data = [{
                source: {
                    x: selectedNode.x,
                    y: selectedNode.y
                },
                target: {
                    x: draggingNode.x,
                    y: draggingNode.y
                }
            }];
        }
        var link = svgGroup.selectAll(".templink").data(data);

        link.enter().append("path")
            .attr("class", "templink")
            .attr("d", d3.svg.diagonal())
            .attr('pointer-events', 'none');

        link.attr("d", d3.svg.diagonal());

        link.exit().remove();
    };

    var svgGroup = baseSvg.append("g");

    d3.json("data.json", function(error, json) {
        // Define the root
        root = json;
        // Layout the tree initially
        update(root);
    });

    function addTopBBox(d, i)
    {
        var bbox = this.getBBox();

        var rect = d3.select(this.parentNode).append("svg:rect")
            .attr("x", bbox.x)
            .attr("y", bbox.y)
            .attr("width", bbox.width)
            .attr("height", bbox.height)
            .style("fill", "#ccc")
            .style("fill-opacity", ".3")
            .style("stroke", "#111")
            .style("stroke-width", "0.3px");

        d.topTextHeight = bbox.height;
    }
    function addBottomBBox(d, i)
    {
        var bbox = this.getBBox();

        var rect = d3.select(this.parentNode).append("svg:rect")
            .attr("x", bbox.x)
            .attr("y", bbox.y)
            .attr("width", bbox.width)
            .attr("height", bbox.height)
            .style("fill", "#ccc")
            .style("fill-opacity", ".3")
            .style("stroke", "#111")
            .style("stroke-width", "0.3px");

        d.downTextHeight = bbox.height;
    }

    function update(source)
    {

        var nodes = tree.nodes(source).reverse();
        var links = tree.links(nodes);

        var xmin = 0;
        nodes.forEach(function (d) {
            d.y += nodeImageH;
            if(d.x < xmin) {
                xmin = d.x;
            }
        });
        nodes.forEach(function (d, i) {
            d.x += (-xmin) + nodeImageW;
        })

        // Join objects to nodes
        var node = svgGroup.selectAll("g.node")
            .data(nodes, function(d, i) { return d.id; });

        // Enter new nodes
        var nodeEnter = node.enter().append("g")
            .call(dragListener)
            .attr("class", "node")
            .attr("transform", function(d) { return "translate(" + (d.x) + "," + (d.y) + ")"; });

        var subNodeEnter = nodeEnter.append("g")
            .attr("class", "node_info")
            .on("click", function (d) {
                alert(d.id + " : " + d.image + " clicked");
            });
        subNodeEnter.append("image")
                .attr("xlink:href", function (d) {
                    return "images/" + d.image;
                })
                .attr("x", -nodeImageW/2)
                .attr("y", -nodeImageH/2)
                .attr("width", nodeImageW)
                .attr("height", nodeImageH);
        subNodeEnter.filter(function(d) { return d.title; }).append("text")
                .attr("dx", 0)
                .attr("dy", -(nodeImageH/2 + 4))
                .style("text-anchor", "middle")
                .text(function(d) { return d.title; })
                .each(addTopBBox);
        subNodeEnter.filter(function(d) { return d.description; }).append("text")
                .attr("dx", 0)
                .attr("dy", nodeImageH/2+10)
                .style("text-anchor", "middle")
                .html(function(d) { return d.description; })
                .each(addBottomBBox);
        /* Special <g> for all last-level childs */
        var lastChildSubNodeEnter = nodeEnter.filter(function(d) { return !d.children; }).append("g")
            .attr("class", "node_new");
        lastChildSubNodeEnter.filter(function(d) { return !d.children; }).append("svg:line")
            .attr("class", "link_new")
            .attr("id", function (d) {
                return "link_"+ d.id+"_new";
            })
            .attr("style", function (d) {
                var image = d.image;
                return "stroke: " + getLinkColor(image) + ";";
            })
            .attr("x1", 0)
            .attr("y1", function (d) {
                return nodeImageH/2 + (d.downTextHeight || 0);
            })
            .attr("x2", 0)
            .attr("y2", function (d) { return newLinkLen + nodeImageH/2;});
        lastChildSubNodeEnter.filter(function(d) { return !d.children; }).append("image")
            .attr("xlink:href","images/add_node.png")
            .attr("x", -9)
            .attr("y", newLinkLen + nodeImageH/2 - 9)
            .attr("width", 18).attr("height", 18)
            .attr("class", "add_node")
            .on("click", function (d) {
                addNode(d, null);
            });
        // phantom node to give us mouseover in a radius around it
        lastChildSubNodeEnter.filter(function(d) { return !d.children; }).append("circle")
            .attr('class', 'ghostCircle')
            .attr("cx", 0)
            .attr("cy", newLinkLen + nodeImageH/2)
            .attr("r", 20)
            .attr("opacity", 0.8) // change this to zero to hide the target area
            .attr('pointer-events', 'mouseover')
            .on("mouseover", function(node) {
                overCircle(node);
            })
            .on("mouseout", function(node) {
                outCircle(node);
            });

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
        node.selectAll("g.node_new").filter(function(d) { return d.children; }).transition()
            .duration(duration)
            .remove();

        // Remove old nodes
        var nodeExit = node.exit().transition()
            .duration(duration)
            .remove();


        /* Draw links */
        var link = svgGroup.selectAll(".link")
            .data(links, function (d, i) {
                return d.source.id+"-"+d.target.id;
            });
        // Enter new links
        link.enter().append("svg:path")
            .attr("class", "link")
            .attr("id", function (d) {
                return "link_" + d.source.id + "_" + d.target.id;
            })
            .attr("style", function (d) {
                var image = d.source.image;
                return "stroke: " + getLinkColor(image) + ";";
            })
            .attr("d", diagonal);

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);
        // Remove old links
        link.exit().transition()
            .remove();

        // Draw AddNodeIcon on links
        var addNodeIcon = svgGroup.selectAll("g.add_node_link").data(links, function (d) {return d.source.id+"-"+d.target.id;})

        addNodeIcon.enter().append("svg:g")
            .attr("class", "add_node add_node_link")
            .attr("transform", function(d) {
                return "translate(" +((d.target.x+d.source.x)/2 - 9) + "," + ((d.target.y+d.source.y)/2 - 9) + ")";
            })
            .append("image").attr("xlink:href","images/add_node.png")
                .attr("id", function (d) {
                    return "add_node_to_" + d.source.id;
                })
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 18).attr("height", 18)
                .on("click", function (d) {
                    addNode(d.source, d.target);
                });
        addNodeIcon.transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" +((d.target.x+d.source.x)/2 - 9) + "," + ((d.target.y+d.source.y)/2 - 9) + ")";
            });
        addNodeIcon.exit()
            .remove();

    }

    function addNode(source, target)
    {
        var insertInMiddle = (!target || d3.event.altKey) ? false : true;

        var images = ["dtmf.png", "call.png", "call_link.png", "check_direction.png", "goto.png", "goto_tree.png"];
        d3.shuffle(images);

        var o = {
            "id": "new_"+ newNodeId++,
            "image": images.shift(),
            "children": []
        }
        if(!source.children) {
            source.children = [];
        }

        if(!insertInMiddle) {
            source.children.push(o);
        }
        else {
            o.children.push(target);
            source.children.forEach(function (d, i) {
                if(d.id == target.id) {
                    source.children[i] = o;
                }
            });
        }
        update(root);
    }

    function getLinkColor(image) {
        if("check_direction.png" == image) {
            return "#E65639"
        }
        else if("dtmf.png" == image) {
            return "#E9C831"
        }
        else if("goto.png" == image || "goto_tree.png" == image) {
            return "#6CBE35"
        }
        else {
            return "#2A98D0"
        }

    }

    //d3.select(self.frameElement).style("height", height + "px");
});
