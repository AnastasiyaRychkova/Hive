class Coordinates
{
	static scaleX;
	static scaleY;
	static space;

	static getSvgX( x ) {
		return x * ( 3 * Coordinates.scaleX + 2 * Math.sqrt( 3 ) * Coordinates.space ) / 4;
	}

	static getSvgY( y ) {
		return y * ( Coordinates.scaleY + Coordinates.space ) / 2;
	}

	static init( scaleX, scaleY, space ) {
		Coordinates.scaleX = scaleX;
		Coordinates.scaleY = scaleY;
		Coordinates.space = space;
	}
}

class Figure
{
	constructor( type, isMy, isActive, coord ) {
		this.type = type;
		this.isMy = isMy;
		this.isActive = isActive; // может быть неактивной, если на руках не осталось такого типа фигур
		if( isMy )
			this.path = new Map();

		if( coord ) {
			this.location.x = coord.x;
			this.location.y = coord.y;
			this.elem = this.createSvg( type, isMy, isActive, coord.x, coord.y );
		} else
			this.coord = null;
	}

	createSvg( type, isMy, isActive, x, y ) {
		const elem = document.createElement( 'use' );
		elem.setAttribute( 'xlink:href', "#" + type );
		elem.setAttribute( 'viewBox', "0 0 585 521" );
		elem.className = type;
		if( !isMy ) {
			elem.setAttribute( 'op', '' );
		}
		if( !isActive ) {
			elem.setAttribute( 'disabled', 'disabled');
		}
		if( x != undefined ) {
			elem.setAttribute( 'x', Coordinates.getSvgX( x ).toString() );
			elem.setAttribute( 'y', Coordinates.getSvgY( y ).toString() );
		}
		
		return elem;
	}

	handleEvent( event ) {
		if( !Game.isPlaying || !Game.rightMove || !this.isActive )
			return;

		switch ( Game.playing ) {
			case PlayingStateEnum.think:
				if( !this.coord ) { // фигура не выложена на стол
					
					this.path.add( this, 0 );
					this.elem.setAttribute( 'path', 'path' );
					Game.playing = PlayingStateEnum.layOut;
					Game.activeFigure = this;
				}
				break;

			case PlayingStateEnum.layOut:
				if( this.type === 'space' ) {
					if( Game.activeFigure.path.has( this ) ) {
						Game.activeFigure.path.delete( this );
						this.elem.removeAttribute( 'path', 'path' );
						Game.playing = PlayingStateEnum.think;
						Game.activeFigure = null;
					}
					else {
						if( Game.activeFigure.path.size === 1 ) {
							Game.activeFigure.path.add( this, 1 );
							this.elem.setAttribute( 'path', 'path' );
						}
					}
				}
				else {
					if( Game.activeFigure === this && this.path.size === 1 ) {
						Game.activeFigure.path.delete( this );
						this.elem.removeAttribute( 'path', 'path' );
						Game.playing = PlayingStateEnum.think;
						Game.activeFigure = null;
					}
				}
				break;

			case PlayingStateEnum.shift:

				break;

			default:
				break;
		}
	}
}