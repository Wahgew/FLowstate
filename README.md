# Flowstate

A rhythm game developed for TCSS 491: Game And Simulation Design - Winter Quarter 2025 at University of Washington Tacoma.

## Overview

Flowstate is a web-based rhythm game inspired by popular titles like osu!mania, StepMania and other vertical scrolling rhythm games. Players hit notes as they fall down the screen in time with music, aiming for accuracy and high scores.

## Features

- **Song Selection**: Browse through 40+ songs with various difficulty levels
- **Sorting Options**: Sort songs by difficulty or title
- **Customizable Controls**: Remap lane keys to your preference
- **Grading System**: Earn grades from F to SS based on accuracy
- **Full Combo Recognition**: Track and display Full Combo achievements
- **Settings Menu**: Adjust volume levels, toggle display options, and customize controls
- **Zen Mode**: Hide UI elements for a distraction-free experience
- **Persistent Data**: Save your scores and settings between sessions

## Screenshots

### Welcome Screen
![Image](https://github.com/user-attachments/assets/b02d2de6-6322-4a5d-9a35-2d8e0ad5ab18)

### Gameplay
![Image](https://github.com/user-attachments/assets/8e11171a-ebf1-4640-841e-f1c24bcc0528)

### Song Selection
![Image](https://github.com/user-attachments/assets/8013e092-2c16-4c9c-b8fb-679087e96016)

## Controls

- Use **S**, **D**, **K**, **L** keys (default) to hit notes in each lane
- Navigate song selection with **Up/Down** arrows
- Press **F9** to toggle Zen Mode
- Press **F11** for fullscreen
- Hold **R** to restart during gameplay

## Technical Implementation

- Built with vanilla JavaScript, HTML5 Canvas for rendering and CSS for styling
- Uses Web Audio API for music visualization and sound effects
- Implements IndexedDB for persistent storage of scores and settings
- Supports custom .osu beatmap format for song charts

## Credits

Developed as a class project for TCSS 491: Game And Simulation Design at the University of Washington Tacoma.