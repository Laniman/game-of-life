# Game of Life

## Overview

This is a simple implementation of [Conway's Game of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life), a cellular automaton devised by the mathematician John Conway. The game is played on a grid of cells, each of which can be in one of two states: alive or dead. The game evolves through generations based on a set of rules.

## Rules

The rules of the game are as follows:

-   Any live cell with two or three live neighbors lives on to the next generation.
-   Any dead cell with exactly three live neighbors becomes a live cell, as if by reproduction.
-   All others live cells die in the next generation.
-   Similarly, all others dead cells stay dead.

For more detailed information, refer to the [Wikipedia page](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life).

## Features

-   The game board is implemented as a torus, where the rightmost cell is a neighbor of the leftmost cell with the same Y coordinate, and the top cell is a neighbor of the bottom cell with the same X coordinate.
-   The size of the game board can be dynamically adjusted through the graphical interface.
-   Initial generation can be generated either by user input using the mouse or randomly.
-   The time taken to generate a new generation is displayed on the screen.

## Implementation

The implementation is done using HTML, CSS, and JavaScript without the use of external libraries or frameworks.
