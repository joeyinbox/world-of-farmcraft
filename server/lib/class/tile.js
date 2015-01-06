module.exports = function Tile(mapX, mapY, x, y, humidity, fertility, element, ownership) {
	this.type = 'tile';
	this.mapX = mapX;
	this.mapY = mapY;
	this.x = x;
	this.y = y;
	this.humidity = humidity;
	this.fertility = fertility;
	this.element = element;
	this.ownership = ownership;
	
	// TODO: vérifier si l'on peut supprimer cette fonction d'initialisation
	this.init = function(mapX, mapY, x, y, humidity, fertility, element, ownership) {
		this.mapX = mapX;
		this.mapY = mapY;
		this.x = x;
		this.y = y;
		this.humidity = humidity;
		this.fertility = fertility;
		this.health = health;
		this.maturity = maturity;
		this.element = element;
		this.ownership = ownership;
	}
}