from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


game_path = Path("game.js")
game = game_path.read_text()

game = replace_once(game, "const VERSION='20260802-phase2c';", "const VERSION='20260802-phase2d';", "version")
game = replace_once(game, "ptero:{action:'down',width:1.38}", "ptero:{action:'down',width:1.24}", "pteranodon width")
game = replace_once(game, "player.vy=8.5", "player.vy=6", "jump velocity")
game = replace_once(game, "player.vy-=20*dt", "player.vy-=22*dt", "jump gravity")
game = replace_once(game, "baseY=h*.925-player.y*h*.22", "baseY=h*.925-player.y*h*.18", "jump render height")

old_track = "ctx.restore();for(const boundary of[-1/3,1/3]){ctx.save();ctx.strokeStyle='rgba(255,239,178,.78)';ctx.lineWidth=Math.max(1.7,w*.005);ctx.setLineDash([Math.max(8,h*.025),Math.max(8,h*.021)]);ctx.lineDashOffset=(distance*1.7)%40;ctx.beginPath();"
new_track = "ctx.restore();const dashOffset=-(distance*1.7%40);for(const boundary of[-1/3,1/3]){ctx.save();ctx.strokeStyle='rgba(255,239,178,.78)';ctx.lineWidth=Math.max(1.7,w*.005);ctx.setLineDash([Math.max(8,h*.025),Math.max(8,h*.021)]);ctx.lineDashOffset=dashOffset;ctx.beginPath();"
game = replace_once(game, old_track, new_track, "lane marker direction")

game = replace_once(
    game,
    "laneCenters:[center-bottomHalf*2/3,center,center+bottomHalf*2/3]}",
    "laneCenters:[center-bottomHalf*2/3,center,center+bottomHalf*2/3],dashOffset:+dashOffset.toFixed(2),dashDirection:'toward-player'}",
    "track diagnostics",
)

old_ptero = "if(o.type==='ptero'){const frame=PTERO_FRAMES[Math.floor((time*7+o.phase)%PTERO_FRAMES.length)],target=p.laneWidth*def.width,lift=48+p.laneWidth*1.02,bob=Math.sin(time*8+o.phase)*Math.max(2,p.laneWidth*.06),cy=p.y-lift+bob;drawShadow(x,p.y+2,p.laneWidth*.56,.2);const rect=frame==='ptero_glide'?drawLegacy(frame,x,cy,target,{anchorY:.52,shadow:true,alpha:o.hit?.45:1}):drawFlightAsset(frame,x,cy,target,{anchorY:.52,shadow:true,alpha:o.hit?.45:1});visualDebug.ptero={frame,groundY:+p.y.toFixed(1),centerY:+cy.toFixed(1),altitude:+(p.y-cy).toFixed(1),rect,laneWidth:+p.laneWidth.toFixed(1),lane:o.lane};visualDebug.obstacles.push({type:o.type,lane:o.lane,rect,laneWidth:+p.laneWidth.toFixed(1),ratio:+(rect.width/p.laneWidth).toFixed(2)});continue}"
new_ptero = "if(o.type==='ptero'){const frame=PTERO_FRAMES[Math.floor((time*7+o.phase)%PTERO_FRAMES.length)],target=p.laneWidth*def.width,ratio=frame==='ptero_glide'?CELL_H/CELL_W:images[frame].height/images[frame].width,spriteHeight=target*ratio,clearance=95+75*p.p,bob=Math.sin(time*8+o.phase)*Math.max(2,p.laneWidth*.045),cy=p.y-clearance-spriteHeight*.5+bob;drawShadow(x,p.y+2,p.laneWidth*.38,.1);const rect=frame==='ptero_glide'?drawLegacy(frame,x,cy,target,{anchorY:.5,shadow:true,alpha:o.hit?.45:1}):drawFlightAsset(frame,x,cy,target,{anchorY:.5,shadow:true,alpha:o.hit?.45:1}),bottom=rect.y+rect.height;visualDebug.ptero={frame,groundY:+p.y.toFixed(1),centerY:+cy.toFixed(1),altitude:+(p.y-cy).toFixed(1),clearance:+(p.y-bottom).toFixed(1),rect,laneWidth:+p.laneWidth.toFixed(1),lane:o.lane};visualDebug.obstacles.push({type:o.type,lane:o.lane,rect,laneWidth:+p.laneWidth.toFixed(1),ratio:+(rect.width/p.laneWidth).toFixed(2)});continue}"
game = replace_once(game, old_ptero, new_ptero, "pteranodon altitude and anchoring")

game_path.write_text(game)

index_path = Path("index.html")
index = index_path.read_text()
index = replace_once(index, "game.js?v=20260802-phase2c", "game.js?v=20260802-phase2d", "index cache version")
index_path.write_text(index)
