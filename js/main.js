function copy2dArray(array) {
	return array.map((arr) => arr.slice());
}

class GameOfLife {
	time = null;
	timeoutId = null;

	constructor({ root, w, h, fps }) {
		if (!root) throw Error("Root not defined");

		this.root = root;
		this.w = Number(w) || 30;
		this.h = Number(h) || 60;
		this.fps = fps || 25;

		this.board = [];
		this.elements = [];
		this.isRunning = false;
		this.directions = [
			[-1, -1],
			[-1, 0],
			[-1, 1],
			[0, 1],
			[1, 1],
			[1, 0],
			[1, -1],
			[0, -1],
		];

		this.initialize();
	}

	initialize() {
        // this.root.addEventListener('click', (evt) => {
        //     const target = evt.target;
        //     if (target.classList.contains('cell')) {
        //         // TODO
        //     }
        // })
		this.prepareBoard();
		this.randomizeBoard();
		// this.controller = new AbortController();
		// this.render();
        this.renderFrame();
		this.updateUI();
		// this.controller.abort();
		// clearTimeout(this.timeoutId);
		// this.controller = new AbortController();
	}

	prepareBoard() {
		for (let i = 0; i < this.h; i++) {
			this.board[i] = [];
			this.elements[i] = [];
			const row = document.createElement("div");
			row.classList.add("row");
			this.root.appendChild(row);
			for (let j = 0; j < this.w; j++) {
				this.board[i][j] = 0;
				const cell = document.createElement("span");
				cell.classList.add("cell");
				row.appendChild(cell);
				this.elements[i][j] = cell;

				cell.addEventListener("click", () => {
					if (this.isRunning) return;
					this.board[i][j] = this.board[i][j] === 1 ? 0 : 1;
                    if (this.board[i][j] === 1) {
                        cell.classList.add("alive");
                    } else {
                        cell.classList.remove("alive");
                    }
				});
			}
		}
	}

	for(cb) {
		if (!cb) return;
		for (let i = 0; i < this.board.length; i++) {
			for (let j = 0; j < this.board[i].length; j++) {
				cb(this.board[i][j], this.elements[i][j], i, j);
			}
		}
	}

	randomizeBoard() {
		this.for((_, __, i, j) => {
			this.board[i][j] = Math.round(Math.random());
		});
        this.renderFrame();
	}

	clearBoard() {
		this.for((_, __, i, j) => {
			this.board[i][j] = 0;
		});
        this.renderFrame();
	}

	tickNextGen() {
		const clone = copy2dArray(this.board);

		this.for((cell, __, i, j) => {
			const count = this.calcNeighbors(i, j);
			if (cell === 1 && (count === 2 || count === 3)) return;
			if (cell === 0 && count === 3) {
				clone[i][j] = 1;
				return;
			}
			clone[i][j] = 0;
		});

		this.board = clone;
	}

	calcNeighbors(i, j) {
		let count = 0;
		this.directions.forEach(([x, y]) => {
			let ni = i + y;
			let nj = j + x;

			if (ni < 0) {
				ni = this.board.length + ni;
			} else if (ni >= this.board.length) {
				ni -= this.board.length;
			}

			if (nj < 0) {
				nj = this.board[ni].length + nj;
			} else if (nj >= this.board[ni].length) {
				nj -= this.board[ni].length;
			}

			if (this.board[ni][nj]) {
				count++;
			}
		});

		return count;
	}

	tick() {
		this.tickNextGen();
		this.for((cell, ui) => {
			if (cell === 1) {
				ui.classList.add("alive");
			} else {
				ui.classList.remove("alive");
			}
		});
	}

    renderFrame() {
        const t0 = performance.now();
        if (this.isRunning) {
            this.tick();
        } else {
            this.for((cell, ui) => {
                if (cell === 1) {
                    ui.classList.add("alive");
                } else {
                    ui.classList.remove("alive");
                }
            });
        }
        const t1 = performance.now();
        this.time = t1 - t0;
        if (this.timeCb) this.timeCb(this.time);
    }

	render() {
		if (this.controller.signal.aborted) return;
        this.renderFrame();
		// const t0 = performance.now();
		// if (this.isRunning) {
		// 	this.tick();
		// }
        //
		// this.for((cell, ui) => {
		// 	if (cell === 1) {
		// 		ui.classList.add("alive");
		// 	} else {
		// 		ui.classList.remove("alive");
		// 	}
		// });
        //
		// const t1 = performance.now();

        this.timeoutId = setTimeout(
			() => requestAnimationFrame(() => this.render()),
			1000 / this.fps,
		);

		// this.time = t1 - t0;
		// if (this.timeCb) this.timeCb(this.time);
	}

	start() {
		if (this.isRunning) return;
		this.isRunning = true;
		this.controller = new AbortController();
		this.render();
		this.updateUI();
		if (this.startCb) this.startCb();
	}

	stop() {
		this.isRunning = false;
		this.updateUI();
		this.controller.abort();
		if (this.stopCb) this.stopCb();
	}

	updateUI() {
		if (this.isRunning) {
			this.root.classList.add("active");
			this.root.classList.remove("idle");
		} else {
			this.root.classList.add("idle");
			this.root.classList.remove("active");
		}
	}

	resizeBoard({ w = this.w, h = this.h }) {
		const clearAndFillBoard = () => {
			this.for((_, ui) => {
				ui.remove();
			});
			this.elements = [];
			this.board = [];
			while (this.root.firstChild) {
				this.root.firstChild.remove();
			}
			this.w = Number(w);
			this.h = Number(h);
			this.prepareBoard();
			this.randomizeBoard();
		};

		if (this.isRunning) {
			this.controller.abort();
			clearTimeout(this.timeoutId);
			clearAndFillBoard();
			this.controller = new AbortController();
			this.render();
		} else {
			clearAndFillBoard();
			this.for((cell, ui) => {
				if (cell === 1) {
					ui.classList.add("alive");
				} else {
					ui.classList.remove("alive");
				}
			});
		}
	}

	onStop(cb) {
		this.stopCb = cb;
	}

	onStart(cb) {
		this.startCb = cb;
	}

	onTime(cb) {
		this.timeCb = cb;
	}
}

const root = document.getElementById("game");
const width = document.getElementById("width");
const height = document.getElementById("height");
const stop = document.getElementById("stop");
const start = document.getElementById("start");
const time = document.getElementById("time");

width.value = 100;
height.value = 60;

const game = new GameOfLife({ root, w: width.value, h: height.value });

const addListener = (id, eventType, cb) => {
	const element = document.getElementById(id);
	if (!element) throw Error(`Element '#${id}' not find`);
	element.addEventListener(eventType, cb);
};

addListener("start", "click", () => game.start());
addListener("stop", "click", () => game.stop());
addListener("tick", "click", () => game.tick());
addListener("random", "click", () => game.randomizeBoard());
addListener("clear", "click", () => game.clearBoard());
addListener("width", "change", (event) => {
	game.resizeBoard({ w: event.currentTarget.value });
});
addListener("height", "change", (event) => {
	game.resizeBoard({ h: event.currentTarget.value });
});

stop.classList.add("disabled");
stop.disabled = true;

game.onStart(() => {
	start.classList.add("disabled");
	start.disabled = true;
	stop.classList.remove("disabled");
	stop.disabled = false;
});

game.onStop(() => {
	start.classList.remove("disabled");
	start.disabled = false;
	stop.classList.add("disabled");
	stop.disabled = true;
});

game.onTime((ms) => {
	time.innerHTML = `${ms.toFixed(5)}ms`;
});
