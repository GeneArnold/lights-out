# Makes cartoon art with SwarmUI on cerebro. The pictures land in art/source/gen/ (kept out of git);
# tools/cutout.py then turns the chosen ones into the sprites in img/.
#   python3 tools/swarm.py <name> "<prompt>" [--n 4] [--w 1024] [--h 1024] [--model zimage|flux] [--seed 1]
import argparse
import json
import pathlib
import urllib.parse
import urllib.request

HOST = "http://192.168.40.110:7801"
MODELS = {
    "zimage": ("ZImage/SwarmUI_Z-Image-Turbo-FP8Mix.safetensors", 8, 1.0),
    "flux": ("flux1-dev-fp8.safetensors", 24, 1.0),
}
STYLE = (", 2D cartoon game art, bold clean black outlines, flat bright colors, simple cel shading, "
         "Saturday-morning cartoon style, full body, centered, isolated on a plain flat pure white background")


def post(path, body):
    req = urllib.request.Request(HOST + path, json.dumps(body).encode(), {"content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=600) as r:
        return json.load(r)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("prompt")
    ap.add_argument("--n", type=int, default=4)
    ap.add_argument("--w", type=int, default=1024)
    ap.add_argument("--h", type=int, default=1024)
    ap.add_argument("--model", default="zimage")
    ap.add_argument("--seed", type=int, default=-1)
    ap.add_argument("--raw", action="store_true", help="leave the cartoon style off the prompt")
    a = ap.parse_args()
    model, steps, cfg = MODELS[a.model]
    session = post("/API/GetNewSession", {})["session_id"]
    out = pathlib.Path("art/source/gen")
    out.mkdir(parents=True, exist_ok=True)
    for i in range(a.n):
        res = post("/API/GenerateText2Image", {
            "session_id": session, "images": 1, "model": model, "steps": steps, "cfgscale": cfg,
            "width": a.w, "height": a.h, "seed": a.seed if a.seed >= 0 else -1,
            "prompt": a.prompt + ("" if a.raw else STYLE),
        })
        if "images" not in res:
            raise SystemExit(f"cerebro said: {res}")
        url = res["images"][0]
        dest = out / f"{a.name}-{i + 1}.png"
        urllib.request.urlretrieve(f"{HOST}/{urllib.parse.quote(url)}", dest)
        print(dest)


main()
