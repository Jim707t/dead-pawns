/**
 * Party management on the board
 * @param {Element} el Control
 */
function Board(el) {
  this.el = el;
  this.draw();
  this.start();
  var self = this;
  el.addEventListener("click", function (event) {
    // Can't click during checkout
    if (self.calculating) {
      return;
    }
    var target = event.target;
    // Move to a free field
    if (target.className === "freecell") {
      self.move(target.dataset.col + target.parentElement.dataset.row);
    }
    // Button press
    if (target.dataset.action) {
      self[target.dataset.action].call(self);
    }
    // Turn on/off auto run
    if (target.id === "automove") {
      self.start();
    }
    // Hint on/off
    if (target.id === "showhelp") {
      self.help();
    }
  });
  this.load();
}

// Initial initialization
Board.prototype.start = async function () {
  this.record = ["h8"];
  this.attacker = Layout.BLACK;
  await this.find();
  this.fill();
};

// draw a board
Board.prototype.draw = function () {
  var desk = this.el.querySelector("table.desk");
  var s = "<tbody><tr><th></th>";
  var a = "a".charCodeAt(0);
  for (var c = 0; c < 15; c++) {
    var ch = String.fromCharCode(a + c);
    s += "<th>" + ch + "</th>";
  }
  s += "<th></th></tr>";
  for (var r = 15; r >= 1; --r) {
    s += '<tr data-row="' + r + '"><th>' + r + "</th>";
    for (var c = 0; c < 15; c++) {
      var ch = String.fromCharCode(a + c);
      s += '<td class="freecell" data-col="' + ch + '">&nbsp;</td>';
    }
    s += "<th>" + r + "</th></tr>";
  }
  s += "<tr><th></th>";
  for (var c = 0; c < 15; c++) {
    var ch = String.fromCharCode(a + c);
    s += "<th>" + ch + "</th>";
  }
  s += "<th></th></tr></tbody>";
  desk.innerHTML = s;
};

// Set stone
Board.prototype.put = function (coord, label, color) {
  var cell = this.el.querySelector(
    'table.desk > tbody > tr[data-row="' +
      coord.substring(1) +
      '"] > td[data-col="' +
      coord.charAt(0) +
      '"]'
  );
  if (label) {
    cell.innerHTML = label;
  }
  if (color) {
    cell.className = color;
  }
};

// remove stone
Board.prototype.remove = function (coord) {
  var cell = coord.innerHTML
    ? coord
    : this.el.querySelector(
        'table.desk > tbody > tr[data-row="' +
          coord.substring(1) +
          '"] > td[data-col="' +
          coord.charAt(0) +
          '"]'
      );
  cell.innerHTML = "&nbsp;";
  cell.className = "freecell";
};

// Arrange stones
Board.prototype.fill = function () {
  // clear board
  var cells = this.el.querySelectorAll("table.desk > tbody > tr > td");
  for (var i = 0; i < cells.length; ++i) {
    this.remove(cells[i]);
  }
  // draw stones on the board
  this.record.forEach(function (coord, index) {
    this.put(coord, "" + (index + 1), index % 2 ? "white" : "black");
  }, this);
  // Draw a sentence for the next steps
  this.help();
  // Set current move color
  this.hand();
};

// Draw a sentence for the next steps
Board.prototype.help = function () {
  var cells = this.el.querySelectorAll("table.desk > tbody > tr > td.freecell");
  for (var i = 0; i < cells.length; ++i) {
    cells[i].innerHTML = "&nbsp;";
  }
  var help = this.el.querySelector("#showhelp").checked;
  var count = this.count();
  if (
    help &&
    typeof this.current === "object" &&
    count > 0 &&
    this.record.length >= 2
  ) {
    for (var coord in this.current) {
      if (coord !== "count") {
        var next = this.current[coord];
        var c = Board.count(next);
        if (count === 225 || c === 225 || c === count - 1) {
          this.put(this.transCoord(coord), "&diams;");
        }
      }
    }
  }
};

// Lock in your winnings
Board.prototype.checkwin = function () {
  if (this.current.count === 1 && this.current.coords) {
    // Stop the game and mark the winning fields on the board
    var desk = this.el.querySelector("table.desk");
    desk.className = "desk";
    var cells = this.el.querySelectorAll("table.desk > tbody > tr > td");
    for (var i = 0; i < cells.length; ++i) {
      cells[i].classList.remove("freecell");
    }
    this.current.coords.forEach(function (coord) {
      var cell = this.el.querySelector(
        'table.desk > tbody > tr[data-row="' +
          coord.substring(1) +
          '"] > td[data-col="' +
          coord.charAt(0) +
          '"]'
      );
      cell.classList.add("font-weight-bold");
    }, this);
  }
};

// Set current move color
Board.prototype.hand = function () {
  var color = this.record.length % 2 ? "white" : "black";
  var desk = this.el.querySelector("table.desk");
  desk.className = "desk " + color;
  var info = this.el.querySelector("table.info");
  var move = info.querySelector('[data-info="move"]');
  var left = info.querySelector('[data-info="left"]');
  var total = info.querySelector('[data-info="total"]');
  var count = this.count();
  move.className = color;
  move.innerHTML = count > 0 ? this.record.length + 1 : "X";
  if (this.current && count < 225) {
    left.innerHTML = count;
    total.innerHTML = count + this.record.length;
  } else {
    left.innerHTML = "";
    total.innerHTML = "";
  }
};

// Make a move
Board.prototype.move = async function (coord) {
  this.calculating = true;
  var index = this.record.length;
  var color = index % 2 ? "white" : "black";
  this.record.push(coord);
  this.put(coord, "" + (index + 1), color);
  await this.find();
  this.help();
  this.hand();
  await this.auto();
  delete this.calculating;
};

// Black/White Automatic Move
Board.prototype.auto = function () {
  var self = this;
  return new Promise(function (resolve) {
    setTimeout(async function () {
      var auto =
        self.el.querySelector("#automove").checked &&
        (self.record.length % 2 === 0
          ? self.attacker === Layout.BLACK
          : self.attacker === Layout.WHITE);
      var count = self.count();
      if (auto && typeof self.current === "object" && count > 0) {
        // Choose the right moves
        var coords = [];
        for (var coord in self.current) {
          if (coord !== "count") {
            var next = self.current[coord];
            var c = Board.count(next);
            if (count === 225 || c === 225 || c === count - 1) {
              coords.push(coord);
            }
          }
        }
        // If 2nd move - choose a random direction
        if (self.record.length === 1) {
          self.transCode = Math.floor(Math.random() * 8);
        }
        // Pick a random move
        await self.move(
          self.transCoord(coords[Math.floor(Math.random() * coords.length)])
        );
      }
      resolve();
    }, 10);
  });
};

// Undo move
Board.prototype.back = async function () {
  this.calculating = true;
  if (this.record.length > 1) {
    var waswin = this.current.count === 1;
    var coord = this.record.pop();
    this.remove(coord);
    await this.find();
    this.help();
    this.hand();
    if (waswin) {
      this.fill();
    }
    // Remove white/black move
    var auto =
      this.el.querySelector("#automove").checked &&
      (this.record.length % 2 === 0
        ? this.attacker === Layout.BLACK
        : this.attacker === Layout.WHITE);
    if (auto) {
      await this.back();
      await this.auto();
    }
  }
  delete this.calculating;
};

// Download Solution
Board.prototype.load = function () {
  var xobj = new XMLHttpRequest(),
    self = this;
  xobj.overrideMimeType("application/json");
  xobj.open("GET", "data/gomoku.json", true);
  self.calculating = true;
  xobj.onreadystatechange = async function () {
    if (xobj.readyState === 4) {
      if (xobj.status === 200) {
        self.solution = JSON.parse(xobj.responseText);
        Board.fillCount(self.solution);
        await self.find();
        self.hand();
      }
      self.hideProgress();
      delete self.calculating;
    }
  };
  xobj.send(null);
  this.showProgress();
};

// Get next moves
Board.prototype.find = async function () {
  // Find current position
  if (this.solution) {
    this.current = this.solution;
    this.transCode = 0;
    var need;
    // Calculation of the current solution
    this.record.forEach(function (coord, index) {
      if (index === 1) {
        // Только на 2-м ходе
        this.transCode = Board.coordTransCode(coord);
      }
      coord = this.transCoord(coord, true);
      var next = this.current[coord];
      if (typeof next !== "object") {
        need = true;
        // Convert to Object
        next =
          typeof next !== "undefined"
            ? {
                count: next,
              }
            : {};
        this.current[coord] = next;
      }
      this.current = next;
    }, this);
    // Calculate continuation
    if (need) {
      await this.estimateProgress();
    }
    // Check for completion
    this.checkwin();
  }
};

// Calculation with progress bar display
Board.prototype.estimateProgress = function () {
  var self = this;
  return new Promise(function (resolve) {
    self.showProgress();
    setTimeout(async function () {
      await self.estimate();
      self.hideProgress();
      resolve();
    }, 10);
  });
};

// Calculation of obligatory moves
Board.prototype.estimate = async function () {
  var moves = [];
  // Convert to solution coordinate table
  this.record.forEach(function (coord) {
    moves.push(
      Layout.transSquare(Board.coordToSquare(coord), this.transCode, true)
    );
  }, this);
  // Calculate required moves score
  var layout = new Layout(moves);
  // In automatic games, we are looking for combinations of completion up to 35 moves
  var computetarget = this.el.querySelector("#automove").checked ? 35 : 225;
  var vertex = Vertex.estimate(
    layout,
    this.record.length % 2 ? Layout.WHITE : Layout.BLACK,
    true,
    computetarget
  );
  if (vertex.state === 0) {
    vertex = Vertex.estimate(
      layout,
      this.record.length % 2 ? Layout.BLACK : Layout.WHITE,
      true,
      computetarget
    );
  }
  if (vertex.state === 0) {
    if (vertex.edges === null || vertex.edges.length === 0) {
      // We select simple moves for a hidden attack
      moves = layout.gains(Pattern.ONE).concat(layout.downs(Pattern.TWO));
      // Let's calculate the received positions
      vertex.edges = [];
      moves.some(function (square) {
        // Create edge with vertex
        var e = this.makeEdge(square);
        // e.vertex.state = 0;
        this.edges.push(e);
      }, vertex);
      // Sort child nodes by rating
      vertex.edges.sort(Edge.Comparator);
      // Leaving positions with the best move
      var es = [];
      var top = vertex.edges[0].vertex;
      vertex.edges.some(function (edge) {
        if (
          edge.vertex.state !== top.state ||
          edge.vertex.rating !== top.rating
        ) {
          return true;
        }
        es.push(edge);
      }, vertex);
      vertex.edges = es;
    }
    vertex.edges.forEach(function (edge) {
      this.current[Board.squareToCoord(edge.square)] = 226;
    }, this);
    return;
  }
  // If position development is predetermined
  if (vertex.edges === null) {
    this.current.count = Math.abs(vertex.state);
    if (this.current.count === 1) {
      // Determine the fields of the winning figure
      var top = vertex.top(),
        moves = top.moves(),
        coords = [];
      moves.forEach(function (move) {
        coords.push(
          Board.squareToCoord(Layout.transSquare(move, this.transCode))
        );
      }, this);
      // Victory
      this.current.coords = coords;
      this.checkwin();
      return;
    } else {
      // Add decision moves
      vertex.moves().forEach(function (move) {
        this.current[Board.squareToCoord(move)] = this.current.count - 1;
      }, this);
      return;
    }
  }
  // Convert Decision Graph to Move List
  Board.vertexToSolution(vertex, this.current);
};

// Solution count
Board.count = function (current) {
  if (typeof current === "object") return Board.fillCount(current) - 1;
  else if (typeof current !== "undefined") return current - 1;
  else return 225;
};

// Solution count
Board.prototype.count = function () {
  return Board.count(this.current);
};

// Counting the number of remaining moves for a position
Board.fillCount = function (current) {
  if (typeof current.count === "undefined") {
    var maxcount = 0;
    for (var coord in current) {
      var count = current[coord];
      // Рекурсия
      if (typeof count === "object") {
        count = Board.fillCount(count);
      }
      if (count > maxcount) {
        maxcount = count;
      }
    }
    current.count = maxcount + 1;
  }
  return current.count;
};

// Determine the transformation number on the 2nd move
Board.squareTransCode = function (square) {
  var offset = square & 0xf,
    number = square >> 4;
  // console.log('[' + number + ':' + offset + ']');
  return number <= 7
    ? offset <= 7
      ? offset <= number
        ? 7
        : 6
      : 14 - offset <= number
      ? 5
      : 0
    : offset <= 7
    ? offset <= 14 - number
      ? 1
      : 4
    : 14 - offset <= 14 - number
    ? 3
    : 2;
};

// Determine the transformation number by the coordinate of the 2nd move
Board.coordTransCode = function (coord) {
  return Board.squareTransCode(Board.coordToSquare(coord));
};

// Convert cell number to coordinates
Board.squareToCoord = function (square) {
  return (
    String.fromCharCode("a".charCodeAt(0) + (square & 0xf)) +
    (15 - (square >> 4))
  );
};

// Reverse conversion of coordinates to cell number
Board.coordToSquare = function (coord) {
  return (
    ((15 - parseInt(coord.substring(1))) << 4) |
    (coord.charCodeAt(0) - "a".charCodeAt(0))
  );
};

// Coordinate transformation
Board.prototype.transCoord = function (coord, back) {
  return Board.squareToCoord(
    Layout.transSquare(Board.coordToSquare(coord), this.transCode, back)
  );
};

// Recursive transformation of vertices into a set of moves
Board.vertexToSolution = function (vertex, current) {
  if (vertex.edges !== null) {
    current = current || {};
    vertex.edges.forEach(function (edge) {
      current[Board.squareToCoord(edge.square)] = Board.vertexToSolution(
        edge.vertex
      );
    }, this);
    return current;
  } else {
    return Math.abs(vertex.state);
  }
};

// Show progress line
Board.prototype.showProgress = function () {
  this.el.querySelector(".line-progress").className = "line-progress active";
};

// Hide progress line
Board.prototype.hideProgress = function () {
  this.el.querySelector(".line-progress").className = "line-progress";
};

// Stroke replacement
Board.prototype.swap = async function () {
  this.attacker = this.attacker === Layout.BLACK ? Layout.WHITE : Layout.BLACK;
  await this.auto();
};

// Next move - two automatic moves
Board.prototype.next = async function () {
  await this.swap();
  await this.swap();
};

// flip board
window.board = new Board(document.getElementById("board"));
