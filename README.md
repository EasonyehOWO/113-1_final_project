# An Intuitive 3D Viewer for Virtual Reality

Use webcam to track user's head position and orientation, and render 3D models in real-time.

[中文版 (Chinese Version)](./README_zh_TW.md)

## Demo
1. Import the SQL file in the `proposal/database` folder into your MySQL database (`sudo mysql < proposal/database/database.sql`).

2. Run the server with `php -S localhost:8000 -d upload_max_filesize=25M -d post_max_size=25M`. (25M is the max post size; 20M max file size is hardcoded in the PHP file "upload_action.php")

3. Visit `http://localhost:8000` in your browser.

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
