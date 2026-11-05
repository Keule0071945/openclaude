#!/bin/bash
# Resumable render: 300-frame segments, finished segments are kept across restarts.
cd "$(dirname "$0")"
pgrep -f "http.server 8765" >/dev/null || (nohup python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &)
sleep 1
mkdir -p segs
N=$(python3 -c "import json,math;print(math.ceil(json.load(open('timeline.json'))['total']*30))")
for ((a=0; a<N; a+=300)); do
  b=$((a+300)); [ $b -gt $N ] && b=$N
  out=segs/seg_$(printf %05d $a).mp4
  [ -f "$out" ] && { echo "skip $out"; continue; }
  curl -s -o /dev/null http://127.0.0.1:8765/ || { (nohup python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &); sleep 1; }
  NODE_PATH=$(npm root -g) node capture3d.cjs seg $a $b "$out" || { echo "FAILED $a"; exit 1; }
done
(cd segs && ls seg_*.mp4 | sed "s/^/file '/;s/$/'/") > segs/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i segs/list.txt -c copy video3d_noaudio.mp4 && echo "ALL DONE"
