function copy2dArray(array) {
    return array.map((arr) => arr.slice());
}

function isFunction(value) {
    return typeof value === "function";
}

function handleHtmlCellClick(evt) {
    if (this.isRunning) return;

    const target = evt.target;

    if (target.classList.contains("cell")) {
        const row = target.parentElement.getAttribute("data-row");
        const col = target.getAttribute("data-col");

        if (isFunction(this.options.onCellClick)) {
            this.options.onCellClick(Number(row), Number(col), target);
        }
    }
}

const cellSize = 12;
const overscan = 5;

class SynchronousRenderState {
    constructor(options) {
        this.root = options.root;
        this.board = options.board;
        this.w = options.w;
        this.h = options.h;
        this.isRunning = options.isRunning;
        this.options = options;
        this.elements = [];

        this.handleCellClick = handleHtmlCellClick.bind(this);
        this.root.addEventListener("click", this.handleCellClick);
        this.prepare();
    }

    prepare() {
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < this.h; i++) {
            this.elements[i] = [];
            const row = document.createElement("div");
            row.classList.add("row");
            row.dataset.row = String(i);
            fragment.appendChild(row);

            for (let j = 0; j < this.w; j++) {
                const cell = document.createElement("span");
                cell.classList.add("cell");
                cell.dataset.col = String(j);
                row.appendChild(cell);
                this.elements[i][j] = cell;
            }
        }

        this.root.appendChild(fragment);
    }

    clear() {
        for (let i = 0; i < this.h; i++) {
            for (let j = 0; j < this.w; j++) {
                this.elements[i][j].remove();
            }
        }

        this.elements = [];

        while (this.root.firstChild) {
            this.root.firstChild.remove();
        }
    }

    destroy() {
        this.clear();
        this.root.removeEventListener("click", this.handleCellClick);
    }

    render() {
        for (let i = 0; i < this.board.length; i++) {
            for (let j = 0; j < this.board[i].length; j++) {
                const cell = this.board[i][j];
                const ui = this.elements[i][j];

                if (cell === 1) {
                    ui.classList.add("alive");
                } else {
                    ui.classList.remove("alive");
                }
            }
        }
    }
}

class VirtualRenderState {
    constructor(options) {
        this.root = options.root;
        this.board = options.board;
        this.w = options.w;
        this.h = options.h;
        this.container = options.container;
        this.isRunning = options.isRunning;
        this.options = options;
        this.scrollTop = 0;
        this.scrollLeft = 0;
        this.containerHeight = options.container.offsetHeight;
        this.containerWidth = options.container.offsetWidth;

        this.handleCellClick = handleHtmlCellClick.bind(this);
        this.handleScroll = this.handleScroll.bind(this);

        this.container.addEventListener("scroll", this.handleScroll);
        this.root.addEventListener("click", this.handleCellClick);

        this.prepare();
    }

    handleScroll(evt) {
        const target = evt.currentTarget;
        this.scrollTop = target.scrollTop;
        this.scrollLeft = target.scrollLeft;

        if (!this.isRunning) {
            this.render();
        }
    }

    get totalHeight() {
        return this.h * cellSize;
    }

    get totalWidth() {
        return this.w * cellSize;
    }

    get virtualRows() {
        const rangeStart = this.scrollTop;
        const rangeEnd = this.scrollTop + this.containerHeight;

        let startIndex = Math.floor(rangeStart / cellSize);
        let endIndex = Math.ceil(rangeEnd / cellSize);

        startIndex = Math.max(0, startIndex - overscan);
        endIndex = Math.min(this.h - 1, endIndex + overscan);

        const virtualRows = [];

        for (let index = startIndex; index <= endIndex; index++) {
            virtualRows.push({
                index,
                offsetTop: index * cellSize,
            });
        }

        return virtualRows;
    }

    get virtualColumns() {
        const rangeStart = this.scrollLeft;
        const rangeEnd = this.scrollLeft + this.containerWidth;

        let columnStartIndex = Math.floor(rangeStart / cellSize);
        let columnEndIndex = Math.ceil(rangeEnd / cellSize);

        columnStartIndex = Math.max(0, columnStartIndex - overscan);
        columnEndIndex = Math.min(this.w - 1, columnEndIndex + overscan);

        const virtualColumns = [];

        for (let index = columnStartIndex; index <= columnEndIndex; index++) {
            virtualColumns.push({
                index,
                offsetLeft: index * cellSize,
            });
        }

        return virtualColumns;
    }

    prepare() {
        this.root.style.height = this.totalHeight + "px";
        this.root.style.width = this.totalWidth + "px";
    }

    clear() {
        this.root.innerHTML = "";
    }

    destroy() {
        this.clear();
        this.root.style.height = "";
        this.root.style.width = "";
        this.root.removeEventListener("click", this.handleCellClick);
        this.container.removeEventListener("scroll", this.handleScroll);
    }

    render() {
        this.root.innerHTML = "";

        const fragment = document.createDocumentFragment();

        this.virtualRows.forEach((virtualRow) => {
            const row = document.createElement("div");
            row.classList.add("row");
            row.style.position = "absolute";
            row.style.top = "0px";
            row.style.transform = `translateY(${virtualRow.offsetTop}px)`;
            row.dataset.row = String(virtualRow.index);
            fragment.appendChild(row);

            this.virtualColumns.forEach((virtualColumn) => {
                const cellEl = document.createElement("span");
                cellEl.classList.add("cell");
                cellEl.style.position = "absolute";
                cellEl.style.left = "0px";
                cellEl.style.transform = `translateX(${virtualColumn.offsetLeft}px)`;
                cellEl.dataset.col = String(virtualColumn.index);
                row.appendChild(cellEl);

                const cell = this.board[virtualRow.index][virtualColumn.index];

                if (cell === 1) {
                    cellEl.classList.add("alive");
                } else {
                    cellEl.classList.remove("alive");
                }
            });
        });

        this.root.appendChild(fragment);
    }
}

class GameOfLife {
    timeoutId = null;

    constructor(options) {
        if (!options.root) throw Error("Root not defined");

        this.options = options;
        this.root = options.root;
        this.container = options.container;
        this.w = Number(options.w) || 30;
        this.h = Number(options.h) || 60;
        this.fps = options.fps || 25;
        this.virtual = options.virtual;

        this.board = [];
        this.isRunning = false;
        this.containerWidth = 800;
        this.containerHeight = 600;
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

        this.handleCellClick = this.handleCellClick.bind(this);

        this.renderState = this.virtual
            ? new VirtualRenderState({
                  w: this.w,
                  h: this.h,
                  root: this.root,
                  board: this.board,
                  isRunning: this.isRunning,
                  container: this.container,
                  onCellClick: this.handleCellClick,
              })
            : new SynchronousRenderState({
                  w: this.w,
                  h: this.h,
                  root: this.root,
                  board: this.board,
                  isRunning: this.isRunning,
                  onCellClick: this.handleCellClick,
              });

        this.prepareBoard();
        this.initialize();
    }

    handleCellClick(row, col, element) {
        if (this.isRunning) return;

        const nextValue = this.board[row][col] === 1 ? 0 : 1;
        this.board[row][col] = nextValue;

        if (nextValue === 1) {
            element.classList.add("alive");
        } else {
            element.classList.remove("alive");
        }
    }

    initialize() {
        this.randomizeBoard();
        this.updateUI();
    }

    prepareBoard() {
        for (let i = 0; i < this.h; i++) {
            this.board[i] = [];
            for (let j = 0; j < this.w; j++) {
                this.board[i][j] = 0;
            }
        }
    }

    for(cb) {
        if (!cb) return;

        for (let i = 0; i < this.board.length; i++) {
            for (let j = 0; j < this.board[i].length; j++) {
                cb(this.board[i][j], i, j);
            }
        }
    }

    randomizeBoard() {
        this.for((_, i, j) => {
            this.board[i][j] = Math.round(Math.random());
        });

        this.renderState.render();
    }

    clearBoard() {
        this.for((_, i, j) => {
            this.board[i][j] = 0;
        });

        this.renderState.render();
    }

    tickNextGen() {
        const clone = copy2dArray(this.board);

        this.for((cell, i, j) => {
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
        this.renderState.board = this.board;
        this.renderState.render();
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.renderState.isRunning = true;
        this.controller = new AbortController();
        this.render();
        this.updateUI();

        if (isFunction(this.options.onStart)) {
            this.options.onStart();
        }
    }

    stop() {
        this.isRunning = false;
        this.renderState.isRunning = false;
        this.updateUI();
        this.controller.abort();

        if (isFunction(this.options.onStop)) {
            this.options.onStop();
        }
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
            this.renderState.clear();
            this.w = Number(w);
            this.h = Number(h);
            this.renderState.w = this.w;
            this.renderState.h = this.h;
            this.board = [];
            this.prepareBoard();
            this.renderState.board = this.board;
            this.renderState.prepare();
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
        }
    }

    switchRenderStrategy(strategy) {
        this.renderState.destroy();

        switch (strategy) {
            case "virtual":
                this.renderState = new VirtualRenderState({
                    w: this.w,
                    h: this.h,
                    root: this.root,
                    board: this.board,
                    isRunning: this.isRunning,
                    container: this.container,
                    containerWidth: this.containerWidth,
                    containerHeight: this.containerHeight,
                    onCellClick: this.handleCellClick,
                });
                break;
            case "synchronous":
                this.renderState = new SynchronousRenderState({
                    w: this.w,
                    h: this.h,
                    root: this.root,
                    board: this.board,
                    isRunning: this.isRunning,
                    onCellClick: this.handleCellClick,
                });
                break;
            default:
                throw Error(`Unknown render strategy: ${strategy}`);
        }

        this.renderState.render();
    }

    render() {
        if (this.controller.signal.aborted) return;

        const t0 = performance.now();

        this.tick();

        const t1 = performance.now();
        const time = t1 - t0;

        if (isFunction(this.options.onTime)) {
            this.options.onTime(time);
        }

        this.timeoutId = setTimeout(
            () => requestAnimationFrame(() => this.render()),
            1000 / this.fps,
        );
    }
}

const root = document.getElementById("game");
const container = document.getElementById("game-container");
const width = document.getElementById("width");
const height = document.getElementById("height");
const stop = document.getElementById("stop");
const start = document.getElementById("start");
const time = document.getElementById("time");
const virtual = document.getElementById("virtual");

width.value = 200;
height.value = 200;
virtual.checked = true;
stop.classList.add("disabled");
stop.disabled = true;

const game = new GameOfLife({
    root,
    w: width.value,
    h: height.value,
    container,
    virtual: virtual.checked,
    onStart: () => {
        start.classList.add("disabled");
        start.disabled = true;
        stop.classList.remove("disabled");
        stop.disabled = false;
    },
    onStop: () => {
        start.classList.remove("disabled");
        start.disabled = false;
        stop.classList.add("disabled");
        stop.disabled = true;
    },
    onTime: (ms) => {
        time.innerHTML = `${ms.toFixed(5)}ms`;
    },
});

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
addListener("virtual", "change", (event) => {
    game.switchRenderStrategy(
        event.currentTarget.checked ? "virtual" : "synchronous",
    );
});
