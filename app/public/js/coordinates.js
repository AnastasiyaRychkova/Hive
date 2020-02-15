class Coordinates
{
	static getSvgX( x ) {
	// 	return x * ( 3 * Coordinates.dX + 2 * Math.sqrt( 3 ) * Coordinates.space ) / 4;
		return x * ( 3 * Coordinates.dX + 2 * Math.sqrt( 3 ) * Coordinates.space ) / 4;
	}

	static getSvgY( y ) {
		return y * ( Coordinates.dY + Coordinates.space ) / 2;
	}

	static init( width, height, space ) {
		Coordinates.dX = width;
		Coordinates.dY = height;
		Coordinates.space = space;
		Coordinates.offset = height / 8;
	}
}

class Field
{
	constructor() {
		this.cells = new Map();
		this.svg = document.getElementById( 'table' );
		this.k = -6;
		this.moving = false;
		this.viewBox = { 
			'x': -3500, 
			'y': -3500,
			'width': 8000,
			'height': 8000 };
		this.mouse = { 'x': 0, 'y': 0 };

		this.svg.addEventListener( 'mousedown', this );
		document.oncontextmenu = function() { return false; }
		document.addEventListener( 'mousemove', this );
		document.addEventListener( 'mouseup', this );

		this.svg.setAttribute( 'viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}` )
	}

	handleEvent( event ) {
		switch (event.type ) {
			case 'mousedown':
				if( event.which === 3 ) {
					event.preventDefault();
					this.moving = true;
					this.mouse.x = event.clientX;
					this.mouse.y = event.clientY;
				}
				break;
			
			case 'mousemove':
				if( this.moving ) {
					this.svg.setAttribute( 'viewBox', `${( event.clientX - this.mouse.x ) * this.k + this.viewBox.x } ${( event.clientY - this.mouse.y ) * this.k + this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}` );
				}
				break;

			case 'mouseup':
				if( this.moving && event.which === 3 ) {
					event.preventDefault();
					this.moving = false;
					this.svg.setAttribute( 'viewBox', `${( event.clientX - this.mouse.x ) * this.k + this.viewBox.x } ${( event.clientY - this.mouse.y ) * this.k + this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}` );
					this.viewBox.x = ( event.clientX - this.mouse.x ) * this.k + this.viewBox.x;
					this.viewBox.y = ( event.clientY - this.mouse.y ) * this.k + this.viewBox.y;
				}
				break;
		}
	}

	constructFrom( result ) {
		for (const figure of result) {
			const type = figure.type.toLowerCase();
			if( figure.x === null ) {
				const cell = Game.hands[ FigureType[type] ];
				if( cell )
					cell.addFigure( type );
				else
					new CellHands( document.getElementById( 'f-' + type ), type ).addFigure( type );
			}
			else {
				const cell = Game.field.cells.get( figure.x + ',' + figure.y );
				if( cell )
					cell.addFigure( type, Game.color == figure.color );
				else
					new CellTable( this.svg, { 'x': figure.x, 'y': figure.y } ).addFigure( type, Game.color == figure.color );
			}
		}
	}
}



class Cell
{
	constructor( svg ) {
		this.stack = [];
		this.svg = svg;

		this.element = document.createElementNS( xmlns, 'use' );
		this.element.setAttributeNS( xmlnsHref, 'xlink:href', "#space" );
		this.element.setAttribute( 'viewBox', "0 0 585 521" );
		this.element.setAttribute( 'class', 'space');
		
		svg.append( this.element );
	}

}

class CellHands extends Cell
{
	constructor( svg, type ) {
		super( svg );
		this.element.setAttributeNS( null, 'x', 0 );
		this.element.setAttributeNS( null, 'y', 0 );
		this.counter = document.getElementById( type + '-counter' );
		this.num = 0;
		this.type = FigureType[type];
		Game.hands[ this.type ] = this;
	}

	addFigure( type ) {
		const elem = new Figure( this, type, true );
		elem.setLocationOffset( this.stack.length );
		if( this.stack.length > 0 )
			this.stack[ this.stack.length - 1 ].isActive = false;
		this.stack.push( elem );
		this.num++;
		this.counter.textContent = this.num;
	}

	pop() {
		if( !this.stack.length )
			return undefined;
		
		this.num--;
		this.counter.textContent = this.num;
		if( this.stack.length > 1 )
			this.stack[ this.stack.length - 2 ].isActive = true;
		return this.stack.pop();
	}

	delete() {
		for (const figure of this.stack)
			figure.element.remove();
		this.stack.length = 0;
		this.num = 0;
		this.counter.textContent = 0;
		this.element.remove();
		Game.hands[ this.type ] = null;
		this.element = null;
	}

}


class CellTable extends Cell
{
	constructor( svg, coord = { 'x': 0, 'y': 0 } ) {
		super( svg );
		this.setLocation( coord );
		this.neighbours = new Set();
		this.inPath = false;
		this.svg.addEventListener( 'click', this );
		Game.field.cells.set( coord.x + ',' + coord.y, this );
	}

	setLocation( coord ) {
		this.location = {
			'x': coord.x,
			'y': coord.y
		};
		this.element.setAttributeNS( null, 'x', Coordinates.getSvgX( coord.x ) );
		this.element.setAttributeNS( null, 'y', Coordinates.getSvgY( coord.y ) );
	}

	addFigure( type, own ) {
		this.push( new Figure( this, type, own ) );
	}

	push( figure ) {
		figure.setLocationOffset( this.stack.length, { 'x': this.location.x, 'y': this.location.y } );
		if( this.stack.length > 0 )
			this.stack[ this.stack.length - 1 ].isActive = false;
		if( figure.cellRef.svg !== this.svg )
			this.svg.append( figure.element );
		figure.cellRef = this;
		this.stack.push( figure );
		if( this.stack.length === 1 ) {
			this._addNeighbourCell( this.location.x, this.location.y + 4 );
			this._addNeighbourCell( this.location.x + 3, this.location.y + 2 );
			this._addNeighbourCell( this.location.x + 3, this.location.y - 2 );
			this._addNeighbourCell( this.location.x, this.location.y - 4 );
			this._addNeighbourCell( this.location.x - 3, this.location.y - 2 );
			this._addNeighbourCell( this.location.x - 3, this.location.y + 2 );
			return;
		}
	}

	_addNeighbourCell( x, y ) {
		const cell = Game.field.cells.get( x + ',' + y );
		if( cell === undefined ) {
			const elem = new CellTable( this.svg, { 'x': x, 'y': y } );
			elem._connectToNeighbours();
			this.svg.append( elem );
		} else {
			cell.neighbours.add( this );
			this.neighbours.add( cell );
		}
	}

	pop() {
		if( this.stack.length === 1 ) {
			const elem = this.stack.pop();
			for( const cell of this.neighbours ) {
				if( cell._isLoner() ) {
					cell.delete();
				}
			}
			return elem;
		}
		if( this.stack.length > 1 )
			this.stack[ this.stack.length - 2 ].isActive = true;
		return this.stack.pop();
	}

	clear() {
		if( !this.stack.length )
			return;

		for( const figure of this.stack ) {
			figure.element.remove();
		}
		this.stack.length = 0;
	}

	delete() {
		this.clear();

		for( const cell of this.neighbours ) // удалить клетку у соседей
			cell.neighbours.delete( this );

		this.element.remove();
		this.element = null;
		Game.field.cells.delete( this.location.x + ',' + this.location.y );
	}

	_isLoner() {
		for( const cell of this.neighbours ) {
			if( cell.stack.length )
				return false;
		}
		return true;
	}

	_connectToNeighbours() {
		this._connectWithCell( this.location.x, this.location.y + 4 );
		this._connectWithCell( this.location.x + 3, this.location.y + 2 );
		this._connectWithCell( this.location.x + 3, this.location.y - 2 );
		this._connectWithCell( this.location.x, this.location.y - 4 );
		this._connectWithCell( this.location.x - 3, this.location.y - 2 );
		this._connectWithCell( this.location.x - 3, this.location.y + 2 );
	}

	_connectWithCell( x, y ) {
		const cell = Game.field.cells.get( x + ',' + y );
		if( cell !== undefined ) {
			this.neighbours.add( cell );
			cell.neighbours.add( this );
		}
	}

	handleEvent( event ) {
		if( event.which !== 1 || !Game.isPlaying || !Game.rightMove )
			return;

		switch ( Game.mode ) {
			case PlayingStateEnum.layOut:
				if( Game.destination ) {
					if( Game.destination === this ) {
						Game.destination = null;
						this.element.removeAttribute( 'data-path' );
						Game.mode = PlayingStateEnum.think;
					}
					else {
						Game.activeFigure.element.removeAttribute( 'data-path' );
						Game.destination = this;
						this.element.setAttribute( 'data-path', 'path' );
					}
				}
				else {
					Game.destination = this;
					this.element.setAttribute( 'data-path', 'path' );
				}
				

			case PlayingStateEnum.shift:
				
				if( Game.path[ Game.path.length - 1 ] === this ) {
					Game.path.pop();
					this.inPath = false;
					this.element.removeAttribute( 'data-path' );
					return;
				}

				if( this.inPath || !Game.path[ Game.path.length - 1 ].neighbours.has( this ) )
					return;

				Game.path.push( this );
				this.element.setAttribute( 'data-path', 'path' );
				this.inPath = true;
				break;
		}
	}
}



class Figure
{
	constructor( cellRef, type, own, coord = { 'x': 0, 'y': 0 } ) {
		this.cellRef = cellRef;
		this.type = type;
		this.own = own;
		this.isActive = true;
		this.element = Figure.createSvg( type, own, true, coord.x, coord.y );
		cellRef.svg.append( this.element );
		this.element.addEventListener( 'click', this );
	}

	static createSvg( type, isMy, isActive, x, y ) {
		const elem = document.createElementNS( xmlns, 'use' );
		elem.setAttributeNS( xmlnsHref, 'xlink:href', "#" + type );
		elem.setAttributeNS( null, 'viewBox', "0 0 585 521" );
		elem.setAttribute( 'class', 'figure' );
		if( !isMy ) {
			elem.setAttribute( 'data-opponent', 'true' );
		}
		if( !isActive ) {
			elem.setAttribute( 'data-disabled', 'true');
		}
		elem.setAttributeNS( null, 'x', Coordinates.getSvgX( x ).toString() );
		elem.setAttributeNS( null, 'y', Coordinates.getSvgY( y ).toString() );
		
		return elem;
	}

	setLocationOffset( num, coord = { 'x': 0, 'y': 0 } ) {
		this.element.setAttributeNS( null, 'x', ( Coordinates.getSvgX( coord.x ) ).toString() );
		this.element.setAttributeNS( null, 'y', ( Coordinates.getSvgY( coord.y ) - Coordinates.offset * num ).toString() );
	}



	handleEvent() {
		if( event.which !== 1 || !Game.isPlaying || !Game.rightMove || !this.isActive )
			return;

		switch ( Game.mode ) {
			case PlayingStateEnum.think:
				if( this.cellRef instanceof CellHands ) { // фигура не выложена на стол
					
					this.element.setAttribute( 'data-path', 'path' );
					Game.mode = PlayingStateEnum.layOut;
					Game.activeFigure = this;
				}
				else { // фигура лежит на столе
					if( this.own ) {
						Game.activeFigure = this;
						Game.path.push( this.cellRef );
						this.cellRef.inPath = true;
						this.element.setAttribute( 'data-path', 'path' );
						Game.mode = PlayingStateEnum.shift;
					}
				}
				break;

			case PlayingStateEnum.layOut:

				if( !this.cellRef instanceof CellHands )
					return;

				if( Game.activeFigure ) {
					if( Game.activeFigure !== this ) {
						Game.activeFigure.element.removeAttribute( 'data-path' );
						Game.activeFigure = this;
						this.element.setAttribute( 'data-path', 'path' );
					}
					else {
						this.element.removeAttribute( 'data-path' );
						Game.activeFigure = null;
						Game.mode = PlayingStateEnum.think;
					}
				}
				else {
					this.element.setAttribute( 'data-path', 'path' );
					Game.activeFigure = this;
				}
				break;

			case PlayingStateEnum.shift:
				if( !this.cellRef instanceof CellTable )
					return;
				
				if( Game.path.length === 1 && this === Game.activeFigure ) {
					Game.path.pop();
					Game.activeFigure = null;
					this.cellRef.inPath = false;
					this.element.removeAttribute( 'data-path' );
					Game.mode = PlayingStateEnum.think;
					return;
				}

				if( Game.path[ Game.path.length - 1 ] === this.cellRef ) {
					Game.path.pop();
					this.cellRef.inPath = false;
					this.element.removeAttribute( 'data-path' );
					return;
				}

				if( this.cellRef.inPath || !Game.path[ Game.path.length - 1 ].neighbours.has( this.cellRef ) )
					return;

				Game.path.push( this.cellRef );
				this.element.setAttribute( 'data-path', 'path' );
				this.cellRef.inPath = true;
				break;
		}
	}
}