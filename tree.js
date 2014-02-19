
$(document).ready(function() {
    var w = 1200,
        h = 3000;
    var newId = 1;

    var root;

    var imageH = 68,
        imageW = 68;
    var newLinkLen = 20;

    var tree = d3.layout.tree().nodeSize([100,180])

    var diagonal = d3.svg.diagonal()
        .source(function(d) {
            return {
                x: d.source.x,
                y: d.source.y + imageH/2 + (d.source.downTextHeight || 0)
            };
        })
        .target(function(d) {
            return {
                x: d.target.x,
                y: d.target.y - imageH/2 - (d.target.topTextHeight || 0)
            };
        });


    var svg = d3.select("#chart-inner").append("svg:svg").attr("width", w).attr("height", h).append("svg:g").attr("transform", "translate(40, 0)");

    d3.json("data.json", function(error, json) {
        root = json;
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
        var duration = 200;

        var nodes = tree.nodes(source).reverse();
        var links = tree.links(nodes);

        var xmin = 0;
        nodes.forEach(function (d) {
            d.y += imageH;
            if(d.x < xmin) {
                xmin = d.x;
            }
        });
        nodes.forEach(function (d, i) {
            d.x += (-xmin);
        })

        // Join objects to nodes
        var node = svg.selectAll("g.node")
            .data(nodes, function(d, i) { return d.id; });

        // Enter new nodes
        var nodeEnter = node.enter()
            .append("svn:g")
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
                .attr("x", -imageW/2)
                .attr("y", -imageH/2)
                .attr("width", imageW)
                .attr("height", imageH);
        subNodeEnter.filter(function(d) { return d.title; }).append("text")
                .attr("dx", 0)
                .attr("dy", -(imageH/2 + 4))
                .style("text-anchor", "middle")
                .text(function(d) { return d.title; })
                .each(addTopBBox);
        subNodeEnter.filter(function(d) { return d.description; }).append("text")
                .attr("dx", 0)
                .attr("dy", imageH/2+10)
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
            .attr("y1", 0)
            .attr("y1", function (d) {
                return imageH/2 + (d.downTextHeight || 0);
            })
            .attr("x2", 0)
            .attr("y2", function (d) { return newLinkLen + imageH/2;});
        lastChildSubNodeEnter.filter(function(d) { return !d.children; }).append("image")
            .attr("xlink:href","images/add_node.png")
            .attr("x", -9)
            .attr("y", newLinkLen + imageH/2)
            .attr("width", 18).attr("height", 18)
            .attr("class", "add_node")
            .on("click", function (d) {
                addNode(d, null);
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
        var link = svg.selectAll(".link")
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
        var addNodeIcon = svg.selectAll("g.add_node_link").data(links, function (d) {return d.source.id+"-"+d.target.id;})

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
            "id": "new_"+ newId++,
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
