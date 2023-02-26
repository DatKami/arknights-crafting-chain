import buildingData from './data/building_data'
import itemTable from './data/item_table'

// helpers for figuring out where to draw arrows (thanks springy.js)
var intersect_line_line = function(p1, p2, p3, p4)
    {
      var denom = ((p4.y - p3.y)*(p2.x - p1.x) - (p4.x - p3.x)*(p2.y - p1.y));
      if (denom === 0) return false // lines are parallel
      var ua = ((p4.x - p3.x)*(p1.y - p3.y) - (p4.y - p3.y)*(p1.x - p3.x)) / denom;
      var ub = ((p2.x - p1.x)*(p1.y - p3.y) - (p2.y - p1.y)*(p1.x - p3.x)) / denom;

      if (ua < 0 || ua > 1 || ub < 0 || ub > 1)  return false
      return arbor.Point(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
    }

var intersect_line_box = function(p1, p2, boxTuple)
{
  var p3 = {x:boxTuple[0], y:boxTuple[1]},
      w = boxTuple[2],
      h = boxTuple[3]

  var tl = {x: p3.x, y: p3.y};
  var tr = {x: p3.x + w, y: p3.y};
  var bl = {x: p3.x, y: p3.y + h};
  var br = {x: p3.x + w, y: p3.y + h};

  return intersect_line_line(p1, p2, tl, tr) ||
        intersect_line_line(p1, p2, tr, br) ||
        intersect_line_line(p1, p2, br, bl) ||
        intersect_line_line(p1, p2, bl, tl) ||
        false
}

const rarityToColor = {
    0: '#CCCCCC',
    1: 'green',
    2: 'blue',
    3: 'pink',
    4: 'yellow',
}

var Renderer = function(canvas){
    var canvas = $(canvas).get(0)
    var ctx = canvas.getContext("2d");
    var particleSystem

    var that = {
      init:function(system){
        //
        // the particle system will call the init function once, right before the
        // first frame is to be drawn. it's a good place to set up the canvas and
        // to pass the canvas size to the particle system
        //
        // save a reference to the particle system for use in the .redraw() loop
        particleSystem = system

        // inform the system of the screen dimensions so it can map coords for us.
        // if the canvas is ever resized, screenSize should be called again with
        // the new dimensions
        particleSystem.screenSize(canvas.width, canvas.height) 
        particleSystem.screenPadding(80) // leave an extra 80px of whitespace per side
        
        // set up some event handlers to allow for node-dragging
        that.initMouseHandling()
      },
      
      redraw:function(){
        // 
        // redraw will be called repeatedly during the run whenever the node positions
        // change. the new positions for the nodes can be accessed by looking at the
        // .p attribute of a given node. however the p.x & p.y values are in the coordinates
        // of the particle system rather than the screen. you can either map them to
        // the screen yourself, or use the convenience iterators .eachNode (and .eachEdge)
        // which allow you to step through the actual node objects but also pass an
        // x,y point in the screen's coordinate system
        // 
        ctx.fillStyle = "white"
        ctx.fillRect(0,0, canvas.width, canvas.height)
        
        var nodeBoxes = {}

        particleSystem.eachNode(function(node, pt1){
            const pt = {x: node.data.rx, y: node.data.ry}
            // node: {mass:#, p:{x,y}, name:"", data:{}}
            // pt:   {x:#, y:#}  node position in screen coords
            // draw a rectangle centered at pt
            var w = 10 * (node.data?.rarity ?? 1)
            ctx.fillStyle = rarityToColor[node.data?.rarity] ?? 'black'
            ctx.fillRect(pt.x-w/2, pt.y-w/2, w,w)

            var label = node.data.name ? $.trim(node.data.name) : '';
            if (label != '' && ctx){
              ctx.save();
                  ctx.font = "1.1em Arial";
                  ctx.textAlign = "center";
                  ctx.lineWidth = 4;
                  ctx.strokeStyle = 'rgba(255,255,255,1)';
                  ctx.strokeText(label, pt.x, pt.y);
                  ctx.fillStyle = "black";
                  ctx.fillText(label, pt.x, pt.y);
              ctx.restore();
            }


            nodeBoxes[node.name] = [pt.x-w/2, pt.y-w-1, w, (w+1)*2]
          })  

        particleSystem.eachEdge(function(edge, pt11, pt22){
            const pt1 = {x: edge.source.data.rx, y: edge.source.data.ry}
            const pt2 = {x: edge.target.data.rx, y: edge.target.data.ry}
            var head = pt1, tail = pt2
            var label = edge.data.count ? $.trim(edge.data.count) : '';
            if (label != '' && ctx){
              const mid_x = (tail.x+head.x+head.x+head.x)/4;
              const mid_y = (tail.y+head.y+head.y+head.y)/4;
              ctx.save();
                  var w = 10
                  ctx.fillStyle = edge.source.data.highlighted ? "orange" : "#CCCCCC"
                  ctx.fillRect(mid_x-w, mid_y-(3*w/2), 2*w,2*w)
                  ctx.font = "1.1em Arial";
                  ctx.textAlign = "center";
                  ctx.lineWidth = 4;
                  ctx.strokeStyle = 'rgba(255,255,255,1)';
                  ctx.strokeText(label, mid_x, mid_y);
                  ctx.fillStyle = "black";
                  ctx.fillText(label, mid_x, mid_y);
              ctx.restore();
            }

          ctx.save()
            // draw a line from pt1 to pt2
            ctx.strokeStyle = "rgba(0,0,0, .333)"
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(pt1.x, pt1.y)
            ctx.lineTo(pt2.x, pt2.y)
            ctx.stroke()
          ctx.restore()

          // find the start point
          tail = intersect_line_box(pt1, pt2, nodeBoxes[edge.source.name])
          head = intersect_line_box(tail, pt2, nodeBoxes[edge.target.name])

          ctx.save()
            var arrowLength = 12
            var arrowWidth = 4
            ctx.fillStyle = "#FF0000"
            ctx.translate(head.x, head.y);
            ctx.rotate(Math.atan2(head.y - tail.y, head.x - tail.x));

            // delete some of the edge that's already there (so the point isn't hidden)
            ctx.clearRect(-arrowLength/2, 1, arrowLength/2, 1)

            // draw the chevron
            ctx.beginPath();
            ctx.moveTo(-arrowLength, arrowWidth);
            ctx.lineTo(0, 0);
            ctx.lineTo(-arrowLength, -arrowWidth);
            ctx.lineTo(-arrowLength * 0.8, -0);
            ctx.closePath();
            ctx.fill();
          ctx.restore()

        })  			
      },
      
      initMouseHandling:function(){
        // no-nonsense drag and drop (thanks springy.js)
        var dragged = null;

        // set up a handler object that will initially listen for mousedowns then
        // for moves and mouseups while dragging
        var handler = {
          clicked:function(e){
            var pos = $(canvas).offset();
            const _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            dragged = particleSystem.nearest(_mouseP);

            if (dragged && dragged.node !== null){
              // while we're dragging, don't let physics move the node
              dragged.node.fixed = true
            }

            $(canvas).bind('mousemove', handler.dragged)
            $(window).bind('mouseup', handler.dropped)

            return false
          },
          dragged:function(e){
            var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

            if (dragged && dragged.node !== null){
              var p = particleSystem.fromScreen(s)
              dragged.node.p = p
            }

            return false
          },

          dropped:function(e){
            if (dragged===null || dragged.node===undefined) return
            console.log(dragged.node.p.x, dragged.node.p.y)
            dragged.node.data.highlighted = false
            dragged = null
            $(canvas).unbind('mousemove', handler.dragged)
            $(window).unbind('mouseup', handler.dropped)
            const _mouseP = null
            return false
          }
        }
        
        // start listening
        $(canvas).mousedown(handler.clicked);

      },
      
    }
    return that
  }    

let xHandler = [60, 60, 65, 85, 300]
let xHandlerDiff = [310, 310, 118, 108, 300]
let rarityCount = [0, 0, 0, 0, 0]

const customPoints = {
    "Compound Cutting Fluid": {x: 1500, y: 800}
}
const customPointsList = Object.keys(customPoints)

export default function render() {    
    var sys = arbor.ParticleSystem(6000, 600, 0.5) // create the system with sensible repulsion/stiffness/friction
    sys.parameters({gravity:true}) // use center-gravity to make the graph settle nicely (ymmv)
    sys.renderer = Renderer("#viewport") // our newly created renderer will have its .init() method called shortly by sys...

    let formulas = buildingData.workshopFormulas
    const items = itemTable.items

    // formulas = Object.values(formulas).map(formula => {
    //     return {
    //         ...formula,
    //         item: items[formula.itemId],
    //     }
    // }).reduce((acc, val) => {
    //     acc[val.formulaId] = val
    //     return acc
    // }, {})
    Object.values(formulas).forEach(f => {
        formulas[f.formulaId].item = items[f.itemId]
        items[f.itemId].madeByCrafting = true
        Object.entries(f.costs).forEach(c => {
            formulas[f.formulaId].costs[c[0]].item = items[c[1].id]
            items[c[1].id].usedInCrafting = true
        })
    })

    Object.values(items).forEach(i => {
        const item = items[i.itemId]
        if (item.buildingProductList) {
            item.buildingProductList.forEach((bpc, index) => {
                if (bpc.roomType === 'WORKSHOP') {
                    items[i.itemId].buildingProductList[index].formula = formulas[bpc.formulaId]
                }
            })
        }
    })

    const _addNode = (item) => {
        const itemParams = {
            name: item.name,
            mass: item.rarity + 1, 
            fixed: true,
            rarity: item.rarity
        }

        if (item.rarity === 4) {
            itemParams.x = xHandler[item.rarity]
        } else {
            itemParams.y = item.rarity * 4
        }

        if (!customPointsList.includes(item.name)) {
            itemParams.rx = xHandler[item.rarity]
            itemParams.ry = 50 + item.rarity * 180
            if (item.rarity === 2 || item.rarity === 3) {
                if (rarityCount[item.rarity] % 2 === 0) {
                    itemParams.ry += 50
                }
            }
            xHandler[item.rarity] += xHandlerDiff[item.rarity]
            rarityCount[item.rarity] += 1
        } else {
            const {x, y} = customPoints[item.name]
            itemParams.rx = x
            itemParams.ry = y
        }

        sys.addNode(item.itemId, itemParams)
    }

    const addCraftingMaterialNode = (item) => {
        if (!sys.getNode(item.itemId)) {
            _addNode(item)
        }
        const creationMethod = item.buildingProductList?.[0]
        if (creationMethod?.roomType === 'WORKSHOP') {
            const costs = creationMethod.formula.costs
            costs.forEach(c => {
                if (!sys.getNode(c.id)) {
                    _addNode(c.item)
                }
                sys.addEdge(item.itemId, c.id, {count: c.count})
            })
        }
    }

    window.items = items
    window.formulas = formulas

    const objectBlackList = [
        'Carbon Stick',
        'Carbon Brick',
        'Light Building Material',
        'Concrete Building Material',
        'Carbon Pack',
        'Reinforced Building Material',
        'Furniture Part',
        'Skill Summary - 1',
        'Skill Summary - 2',
        'Skill Summary - 3',
    ]

    const stuff = Object.values(items).filter(i => (i.usedInCrafting || i.madeByCrafting) && !i.name.includes(' Chip') && objectBlackList.indexOf(i.name) === -1)
    window.stuff = stuff

    const ords = [
        ['Orirock', 'Ester', 'Oriron Shard', 'Sugar Substitute', 'Diketon', 'Damaged Device'],
        ['Orirock Cube', 'Polyester', 'Oriron', 'Sugar', 'Polyketon', 'Device'],
        ['Manganese Ore', 'Orirock Cluster', 'Loxic Kohl', 'Polyester Pack', 'Grindstone', 'Oriron Cluster', 'RMA70-12',  'Sugar Pack',  'Coagulating Gel', 'Aketon',  'Incandescent Alloy', 'Integrated Device', 'Crystalline Component', 'Semi-Synthetic Solvent', 'Compound Cutting Fluid'],
        ['Orirock Concentration', 'Sugar Lump', 'Polyester Lump', 'Oriron Block', 'Keton Colloid', 'Optimized Device', 'White Horse Kohl', 'Manganese Trihydrate', 'Grindstone Pentahydrate', 'RMA70-24', 'Polymerized Gel', 'Incandescent Alloy Block', 'Crystalline Circuit', 'Refined Solvent', 'Cutting Fluid Solution'],
        ['Polymerization Preparation', 'Bipolar Nanoflake', 'D32 Steel', 'Crystalline Electronic Unit'],
    ]

    const ord = ords.reduce((acc, cur) => {
        return acc.concat(cur)
    }, [])

    console.log(ord)

    const organizedStuff = ord.map(o => stuff.find(s => s.name === o))

    organizedStuff.forEach(i => addCraftingMaterialNode(i))

    // or, equivalently:
    //
    // sys.graft({
    //   nodes:{
    //     f:{alone:true, mass:.25}
    //   }, 
    //   edges:{
    //     a:{ b:{},
    //         c:{},
    //         d:{},
    //         e:{}
    //     }
    //   }
    // })
    
}
