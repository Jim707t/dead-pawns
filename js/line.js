/**
 * Line
 * @param {int} number Line number
 * @param {int} blen Number of black stones or stroke offset of one stone
 * @param {int} wlen Number of white gems or offset color of one gem
 * @param {int} stroke Byte string 01 - white, 10 - black
 * @param {int} inverse Inverse byte string
 */
function Line(number, blen, wlen, stroke, inverse) {
  this.number = number;

  this.blen = blen || 0;

  this.wlen = wlen || 0;

  this.stroke = stroke || 0;

  this.inverse = inverse || 0;

  if (
    typeof stroke === "undefined" &&
    typeof inverse === "undefined" &&
    typeof blen !== "undefined" &&
    typeof wlen !== "undefined"
  ) {
    var offset = blen;
    var hand = wlen;
    if (hand > 0) {
      this.blen = 1;
      this.wlen = 0;
    } else {
      this.blen = 0;
      this.wlen = 1;
    }
    var shift = offset << 1;
    this.stroke = 1 << (shift + hand);
    var right = (Line.lineLength(number) - 1) << 1;
    this.inverse = 1 << (right - shift + hand);
  }
}

// Set the stone to the required position on the line
Line.prototype.putStone = function (offset, hand) {
  var shift = offset << 1;
  if ((this.stroke & (3 << shift)) > 0) {
    throw new RangeError("Square already occupated");
  }
  var str = (this.stroke & ~(3 << shift)) | (1 << (shift + hand));
  var right = (Line.lineLength(this.number) - 1) << 1;
  var inv =
    (this.inverse & ~(3 << (right - shift))) | (1 << (right - shift + hand));
  return hand > 0
    ? new Line(this.number, this.blen + 1, this.wlen, str, inv)
    : new Line(this.number, this.blen, this.wlen + 1, str, inv);
};

// Line Direction
Line.LEFT_RIGTH = 0;
Line.TOP_DOWN = 1;
Line.LTOP_RDOWN = 2;
Line.RTOP_LDOWN = 3;

// Get the color of the stone on the field. -1 if there is no stone
Line.prototype.getStone = function (offset) {
  var shift = offset << 1;
  if ((this.stroke & (1 << shift)) > 0) {
    return 0;
  }
  if ((this.stroke & (1 << (shift + 1))) > 0) {
    return 1;
  }
  return -1;
};

// Remove stone from position
Line.prototype.removeStone = function (offset, hand) {
  var shift = offset << 1;
  if ((this.stroke & (3 << shift)) !== 1 << (shift + hand)) {
    throw new RangeError("No hand stone in the square");
  }
  var str = this.stroke & ~(3 << shift);
  var right = (Line.lineLength(this.number) - 1) << 1;
  var inv = this.inverse & ~(3 << (right - shift));
  return hand > 0
    ? new Line(this.number, this.blen - 1, this.wlen, str, inv)
    : new Line(this.number, this.blen, this.wlen - 1, str, inv);
};

Line.lineNumber = function (direction, square) {
  switch (direction) {
    case Line.LEFT_RIGTH:
      return (direction << 5) | (square >> 4);
    case Line.TOP_DOWN:
      return (direction << 5) | (square & 0xf);
    case Line.LTOP_RDOWN:
      return (direction << 5) | ((square & 0xf) - (square >> 4) + 14);
    case Line.RTOP_LDOWN:
      return (direction << 5) | ((square & 0xf) + (square >> 4));
    default:
      return 0;
  }
};

Line.onSameLine = function (number, square) {
  return number === Line.lineNumber(number >> 5, square);
};

Line.lineLength = function (number) {
  var direction = number >> 5;
  switch (direction) {
    case Line.LTOP_RDOWN:
    case Line.RTOP_LDOWN:
      var i = number & 0x1f;
      return i > 14 ? 29 - i : i + 1;
    default:
      return 15;
  }
};

Line.lineOffset = function (direction, square) {
  var col = square & 0xf;
  var row = square >> 4;
  switch (direction) {
    case Line.LEFT_RIGTH:
      return col;
    case Line.TOP_DOWN:
      return row;
    case Line.LTOP_RDOWN:
      return col > row ? row : col;
    case Line.RTOP_LDOWN:
      return col + row > 14 ? 14 - col : row;
    default:
      return 0;
  }
};

// Identifier of the field on the board by line number and distance
Line.posSquare = function (number, offset) {
  var direction = number >> 5;
  var n = number & 0x1f;
  switch (direction) {
    case Line.LEFT_RIGTH:
      return (n << 4) | offset;
    case Line.TOP_DOWN:
      return (offset << 4) | n;
    case Line.LTOP_RDOWN:
      return n > 14
        ? (offset << 4) | (n + offset - 14)
        : ((offset - n + 14) << 4) | offset;
    case Line.RTOP_LDOWN:
      return n > 14
        ? ((n + offset - 14) << 4) | (14 - offset)
        : (offset << 4) | (n - offset);
    default:
      return 0;
  }
};

Line.prototype.findFigures = function (figures, type) {
  type = type || Pattern.ONE;
  var len = Line.lineLength(this.number);
  var stroke = this.stroke;
  var bl = this.blen;
  var wl = this.wlen;
  var probe = stroke;
  var move = 0;
  while (probe > 0) {
    if ((probe & 2) > 0) {
      Pattern.SOLVER_PATTERNS.forEach(function (patterns) {
        patterns.some(function (pattern) {
          var offset = move - pattern.move;
          if (
            pattern.type <= type &&
            bl >= pattern.moves.length &&
            offset >= 0 &&
            offset + pattern.length <= len &&
            (offset > 0 ? (stroke >> ((offset - 1) << 1)) & 2 : 0) === 0 &&
            ((stroke >> ((offset + pattern.length) << 1)) & 2) === 0 &&
            ((stroke >> (offset << 1)) & pattern.mask) === pattern.black
          ) {
            figures.push(new Figure(this.number, offset, 1, pattern));
            return true;
          }
        }, this);
      }, this);
      bl--;
    }

    if ((probe & 1) > 0) {
      Pattern.SOLVER_PATTERNS.forEach(function (patterns) {
        patterns.some(function (pattern) {
          var offset = move - pattern.move;
          if (
            pattern.type <= type &&
            wl >= pattern.moves.length &&
            offset >= 0 &&
            offset + pattern.length <= len &&
            (offset > 0 ? (stroke >> ((offset - 1) << 1)) & 1 : 0) === 0 &&
            ((stroke >> ((offset + pattern.length) << 1)) & 1) === 0 &&
            ((stroke >> (offset << 1)) & pattern.mask) === pattern.white
          ) {
            figures.push(new Figure(this.number, offset, 0, pattern));
            return true;
          }
        }, this);
      }, this);
      wl--;
    }

    probe >>= 2;
    move++;
  }
};

Line.prototype.compareTo = function (e) {
  return this.number < e.number
    ? -1
    : this.number > e.number
    ? 1
    : this.stroke < e.stroke
    ? -1
    : this.stroke > e.stroke
    ? 1
    : 0;
};

Line.Comparator = function (line1, line2) {
  return line1.number < line2.number
    ? -1
    : line1.number > line2.number
    ? 1
    : line1.stroke < line2.stroke
    ? -1
    : line1.stroke > line2.stroke
    ? 1
    : 0;
};

Line.prototype.hashCode = function () {
  var hash = 3;
  hash = 89 * hash + this.stroke;
  hash = 89 * hash + this.number;
  return hash;
};

Line.prototype.equals = function (obj) {
  if (this === obj) {
    return true;
  }
  if (obj === null) {
    return false;
  }
  return this.stroke === obj.stroke && this.number === obj.number;
};
