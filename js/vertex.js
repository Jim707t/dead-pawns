/**
 * Graph vertices
 * @param {Line[]} lines
 * @param {int} hand Current turn
 * @param {Figure[]} figures Figures found
 * @param {int} type Maximum shape template
 * @param {int} count Number of stones on the board
 * @param {int} attacker Attacker
 */
function Vertex(lines, hand, figures, type, count, attacker) {
  if (lines instanceof Layout) {
    var layout = lines;
    Layout.call(
      this,
      layout.lines,
      layout.hand,
      layout.figures,
      layout.type,
      layout.count
    );
  } else {
    Layout.apply(this, arguments.slice(0, arguments.length - 1));
  }
  this.attacker = arguments[arguments.length - 1];

  // Solution state
  // Zero - unknown, positive - win, negative - lose
  // Number of moves before losing or winning one less state
  this.state = 0;

  this.rating = 0;

  this.edges = null;
}

Vertex.prototype = Object.create(Layout.prototype);
Vertex.prototype.constructor = Vertex;

Vertex.estimate = function (
  layout,
  attacker,
  alledges,
  computetarget,
  estimatedepth
) {
  var root = new Vertex(layout.alignType(Pattern.OPEN_TWO), attacker);
  root.prepare();
  computetarget = computetarget || 35;
  var target = computetarget - root.count + 1;
  estimatedepth = estimatedepth || 17;
  var count = Math.max(Math.min(target - 2, estimatedepth), 0);
  for (var level = 0; level <= count; level++) {
    root.estimate(level, alledges, computetarget);
    if (root.state !== 0) {
      break;
    }
  }
  if (
    (attacker === layout.hand && root.state < 0) ||
    (attacker !== layout.hand && root.state > 0)
  ) {
    root.state = 0;
  }
  if (Math.abs(root.state) > target) {
    root.state = 0;
  }
  return root;
};

Vertex.prototype.moves = function () {
  if (this.edges === null) {
    if (this.state > 0) {
      if (this.state < 4) {
        return this.gains(Pattern.FOUR);
      } else if (this.state < 6) {
        return this.gains(Pattern.OPEN_THREE);
      }
    } else if (this.state < 0) {
      if (this.state > -5) {
        return this.downs(Pattern.OPEN_FOUR);
      }
    }
  } else {
    var r = [];
    if (this.edges.length > 0) {
      var top = this.edges[0].vertex;
      this.edges.some(function (e) {
        if (e.vertex.state !== top.state) {
          return true;
        }
        r.push(e.square);
      });
    }
    return r;
  }
  return null;
};

Vertex.prototype.prepare = function () {
  var top = this.top();
  if (top !== null) {
    if (top.hand === this.hand) {
      switch (top.pattern.type) {
        // Победа
        case Pattern.FIVE:
          this.state = 1;
          break;
        case Pattern.OPEN_FOUR:
        case Pattern.FOUR:
          this.state = 2;
          break;
        case Pattern.OPEN_THREE:
          this.state = 4;
          break;
        case Pattern.THREE:
        case Pattern.OPEN_TWO:
          this.state = this.attacker === this.hand ? 0 : 1;
          break;
        default:
          this.state = this.attacker === this.hand ? -1 : 1;
      }
    } else {
      switch (top.pattern.type) {
        case Pattern.FIVE:
          this.state = -1;
          break;
        case Pattern.OPEN_FOUR:
          this.state = -3;
          break;
        case Pattern.FOUR:
        case Pattern.OPEN_THREE:
          this.state = 0;
          break;
        default:
          this.state = this.attacker === this.hand ? -1 : 1;
      }
    }
  } else {
    this.state = this.attacker === this.hand ? -1 : 1;
  }
  this.rating = this.rate();
};

Vertex.prototype.expand = function (alledges, computetarget) {
  var moves = [];
  var top = this.top();
  switch (top.pattern.type) {
    case Pattern.FOUR:
      moves = this.downs(Pattern.FOUR);
      break;
    case Pattern.OPEN_THREE:
      moves = this.gains(Pattern.THREE);
      this.downs(Pattern.OPEN_THREE).forEach(function (square) {
        if (moves.indexOf(square) === -1) {
          moves.push(square);
        }
      }, this);
      break;
    default:
      moves = this.gains(Pattern.OPEN_TWO);
  }
  this.edges = [];
  moves.some(function (square) {
    var e = this.makeEdge(square);
    var target = computetarget - this.count + 1;
    if (Math.abs(e.vertex.state) > target) {
      e.vertex.state = 0;
      e.vertex.edges = null;
    }
    if (!alledges && e.vertex.state < 0) {
      this.edges = [e];
      return true;
    }
    this.edges.push(e);
  }, this);
  this.check();
};

Vertex.prototype.makeMove = function (square) {
  var layout = Layout.prototype.makeMove.call(this, square);
  return new Vertex(layout, this.attacker);
};

Vertex.prototype.makeEdge = function (square) {
  var v = this.makeMove(square);
  v.prepare();
  return new Edge(square, v);
};

Vertex.prototype.estimate = function (level, alledges, computetarget) {
  if (this.state === 0 && this.edges === null && level > 0) {
    this.expand(alledges, computetarget);
  }
  if (this.state === 0 && this.edges !== null && level > 1) {
    this.edges.some(function (e) {
      var v = e.vertex;
      v.estimate(level - 1, false, computetarget);
      if (
        !alledges &&
        (v.state < 0 || (this.attacker !== this.hand && v.state === 0))
      ) {
        return true;
      }
    }, this);
    this.check();
  }
};

Vertex.prototype.check = function () {
  if (this.edges !== null && this.edges.length > 0 && this.state !== -128) {
    this.edges.sort(Edge.Comparator);
    var top = this.edges[0].vertex;
    if (this.attacker === this.hand) {
      if (top.state < 0 && top.state !== -128) {
        this.state = -top.state + 1;
        var es = [];
        this.edges.some(function (edge) {
          if (edge.vertex.state !== top.state) {
            return true;
          }
          es.push(edge);
        }, this);
        this.edges = es;
      } else if (top.state > 0) {
        this.state = -1;
        this.edges = null;
      }
    } else {
      if (top.state < 0 && top.state !== -128) {
        this.state = 1;
        this.edges = null;
      } else if (top.state > 0) {
        this.state = -top.state - 1;
        var es = [];
        this.edges.forEach(function (edge) {
          if (edge.vertex.edges !== null || edge.vertex.state === top.state) {
            es.push(edge);
          }
        }, this);
        this.edges = es;
      }
    }
  }
};

Vertex.prototype.compareTo = function (v) {
  if (v === null) {
    return -1;
  }
  if (v.state === this.state) {
    return this.rating - v.rating;
  }
  if ((v.state >= 0 && this.state <= 0) || (v.state <= 0 && this.state >= 0)) {
    return this.state - v.state;
  } else {
    return v.state - this.state;
  }
};

Vertex.Comparator = function (v1, v2) {
  if (v1 === null) {
    return v2 === null ? 0 : 1;
  }
  return v1.compareTo(v2);
};
