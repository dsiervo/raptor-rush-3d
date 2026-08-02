from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


game_path = Path("game.js")
game = game_path.read_text()
game = replace_once(
    game,
    "const VERSION='20260802-phase2b';",
    "const VERSION='20260802-phase2c';",
    "version",
)
game = replace_once(
    game,
    "const PTERO_FRAMES=['ptero_glide','ptero_mid','ptero_up','ptero_mid'];",
    "const PTERO_FRAMES=['ptero0','ptero1','ptero_glide','ptero1'];",
    "pteranodon sequence",
)
game = replace_once(
    game,
    "function loadAssets(){return Promise.all([loadImage('atlas',`assets/game-atlas.avif?v=20260801-mega2`),loadImage('player',`assets/raptor-player.avif?v=20260801-phase1`)])}",
    "function loadAssets(){return Promise.all([loadImage('atlas',`assets/game-atlas.avif?v=20260801-mega2`),loadImage('player',`assets/raptor-player.avif?v=20260801-phase1`),loadImage('ptero0',`assets/ptero-flight-0.avif?v=${VERSION}`),loadImage('ptero1',`assets/ptero-flight-1.avif?v=${VERSION}`)])}",
    "asset loader",
)
game = replace_once(
    game,
    "function drawShadow(x,y,width,alpha=.2){",
    "function drawFlightAsset(name,x,y,targetWidth,opts={}){const im=images[name],dw=targetWidth,dh=targetWidth*(im.height/im.width);ctx.save();ctx.translate(x,y);if(opts.alpha!==undefined)ctx.globalAlpha=opts.alpha;if(opts.shadow)ctx.filter='drop-shadow(0 8px 8px rgba(0,0,0,.36))';const anchorY=opts.anchorY??.52;ctx.drawImage(im,-dw/2,-dh*anchorY,dw,dh);ctx.restore();ctx.filter='none';ctx.globalAlpha=1;return{x:x-dw/2,y:y-dh*anchorY,width:dw,height:dh}}\nfunction drawShadow(x,y,width,alpha=.2){",
    "flight asset renderer",
)
game = replace_once(
    game,
    "const rect=drawLegacy(frame,x,cy,target,{anchorY:.52,shadow:true,alpha:o.hit?.45:1});",
    "const rect=frame==='ptero_glide'?drawLegacy(frame,x,cy,target,{anchorY:.52,shadow:true,alpha:o.hit?.45:1}):drawFlightAsset(frame,x,cy,target,{anchorY:.52,shadow:true,alpha:o.hit?.45:1});",
    "pteranodon renderer",
)
game_path.write_text(game)

index_path = Path("index.html")
index = index_path.read_text()
index = replace_once(
    index,
    "game.js?v=20260802-phase2b",
    "game.js?v=20260802-phase2c",
    "index cache version",
)
index_path.write_text(index)

test_path = Path("qa/phase2-test.js")
test = test_path.read_text()
test = replace_once(
    test,
    "assert(assets.player?.width > 0 && assets.player?.height > 0, 'player atlas did not load');",
    "assert(assets.player?.width > 0 && assets.player?.height > 0, 'player atlas did not load');\n  assert.deepEqual(assets.ptero0, { width: 512, height: 384 });\n  assert.deepEqual(assets.ptero1, { width: 512, height: 384 });",
    "pteranodon asset assertions",
)
test = replace_once(
    test,
    "assert(pteroFrames.size >= 3, `pteranodon animation showed only: ${[...pteroFrames]}`);",
    "assert(pteroFrames.size >= 3, `pteranodon animation showed only: ${[...pteroFrames]}`);\n  assert(![...pteroFrames].some(frame => frame === 'ptero_up' || frame === 'ptero_mid'), `old vertical pteranodon frames remain: ${[...pteroFrames]}`);",
    "pteranodon frame assertions",
)
test_path.write_text(test)
