/**
 * Figure on the board
 * @param {int} number Line number
 * @param {int} offset Offset of the beginning of the shape
 * @param {int} hand Color of shape stones
 * @param {Pattern} pattern
 */
function Figure(number, offset, hand, pattern) {
  // Line number
  this.number = number;

  //Figure start offset
  this.offset = offset;

  // Shape stone color
  this.hand = hand;

  // Figure template
  this.pattern = pattern;
}

// Shape comparison function
Figure.Comparator = function (hand) {
  return function (f1, f2) {
    return (
      (f1.hand === hand ? f1.pattern.type : f1.pattern.type + 2) -
      (f2.hand === hand ? f2.pattern.type : f2.pattern.type + 2)
    );
  };
};

// Add to collection
Figure.prototype.addMoves = function (r, cols) {
  cols = cols || this.pattern.moves;
  for (var i = 0; i < cols.length; i++) {
    var square = Line.posSquare(this.number, this.offset + cols[i]);
    if (r.indexOf(square) === -1) r.push(square);
  }
};

// Build an array of fields by relative coordinates
Figure.prototype.moves = function (cols) {
  var r = [];
  cols = cols || this.pattern.moves;
  this.addMoves(r, cols);
  return r;
};

// Is the square occupied by a piece
Figure.prototype.contains = function (square, cols) {
  cols = cols || this.pattern.moves;
  for (var i = 0; i < cols.length; i++) {
    if (square === Line.posSquare(this.number, this.offset + cols[i])) {
      return true;
    }
  }
  return false;
};

// Gain Moves
Figure.prototype.gains = function () {
  return this.moves(this.pattern.gains);
};

// Gain Moves
Figure.prototype.addGains = function (r) {
  this.addMoves(r, this.pattern.gains);
};

// Closing moves
Figure.prototype.downs = function () {
  return this.moves(this.pattern.downs);
};

// Closing moves
Figure.prototype.addDowns = function (r) {
  this.addMoves(r, this.pattern.downs);
};

// Piece-breaking moves
Figure.prototype.rifts = function () {
  return this.moves(this.pattern.rifts);
};

// Piece-breaking moves
Figure.prototype.addRifts = function (r) {
  this.addMoves(r, this.pattern.rifts);
};

// Check if the move is on the line
Figure.prototype.onSameLine = function (square) {
  return Line.onSameLine(this.number, square);
};
