module.exports = function Wheat(data) {
	this.type = 'wheat';
	this.drawX = 0;
	this.drawY = -28;
	this.maturated = data.maturated;
	
	// On définit le niveau en fonction de la maturité et du niveau de vie
	if(data.health==0) {
		this.level = 5;
	}
	else if(data.maturity<10) {
		this.level = 0;
	}
	else if(data.maturity<30) {
		this.level = 1;
	}
	else if(data.maturity<60) {
		this.level = 2;
	}
	else if(data.maturity<80) {
		this.level = 3;
	}
	else {
		this.level = 4;
	}
	
	// On définit également la qualité en fonction du niveau de vie
	if(data.health<=10) {
		this.quality = 0;
	}
	else if(data.health<=30) {
		this.quality = 1;
	}
	else if(data.health<=60) {
		this.quality = 2;
	}
	else if(data.health<=80) {
		this.quality = 3;
	}
	else {
		this.quality = 4;
	}
}