# An Intuitive 3D Viewer for Virtual Reality

Use webcam to track user's head position and orientation, and render 3D models in real-time.

[中文版 (Chinese Version)](./README_zh_TW.md)

## Demo
1. Execute `npx serve .` or `python3 -m http.server` on the root directory
2. Open the localhost link (or that with `0.0.0.0` address) (typically on port `:3000` or `:8000`)
3. Tada! Load your file thru drag-n-drop.


## Features
### Move around in the world

The viewer supports full keyboard navigation:

- **Movement (WASD)**:
  - `W`, `S`: Move Forward / Backward (relative to current view direction on XZ plane)
  - `A`, `D`: Move Left / Right (relative to current view direction)
  - `T`, `B`: Move Up / Down (Global Y-axis, like an elevator)

- **Look Around (Virtual Eye Movement)**:
  - `Arrow Up`, `Down`: Look Up / Down
  - `Arrow Left`, `Right`: Look Left / Right

- **Quick Resets**:
  - `O`: Reset Position to Origin (X=0, Z=0)
  - `I`: Reset Height to Ground Level (Y=0)
  - `0`: Reset Rotation (Look straight)

## Roadmap
[Link](./proposal/roadmap/readme.md)

## Other Links
To get some free glb models, go to this archived repo [here]( https://github.com/KhronosGroup/glTF-Sample-Models/blob/main/2.0/Duck/glTF-Binary/Duck.glb )
