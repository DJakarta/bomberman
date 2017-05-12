/*
to do:
AI
- for each player generate a lee matrix at each change of cell, as well as at beginning
*/

//shortcuts
var floor=Math.floor,
	max=Math.max,
	min=Math.min,
	pi=Math.PI;

//general global variables
var 
	//dimensions in cells
	width=15,
	height=11,
	ratio=width/height,
	
	//window dimensions
	windowWidth=$(window).width(),
	windowHeight=$(window).height()-27,
	windowRatio=windowWidth/windowHeight,
	ppc,
	scale,
	
	//playing state and update speed
	playing=false,
	targetFramerate=24,
	actualFramerate,
	displayFramerate=false,
	intervalReference,
	dateReference=(new Date).getTime(),
	stepsNumber=0,
	renderWalls=[],
	
	//players
	players=new Array(10),
	
	//directions
	up='up',
	down='down',
	right='right',
	left='left',
	
	//enclosed cell limits
	//if there is a wall in the corresponding direction you cannot come closer than this
	upLimit=0.3,
	downLimit=0.2,
	rightLimit=0.2,
	leftLimit=0.2,
	epsilon=0.0001,
	
	//movement globals
	defaultMovement=0.10,
	//maximum movement is a cell minus the largest limit
	maximumMovement=1-max(upLimit, downLimit, rightLimit, leftLimit),
	
	//bombs
	defaultBombTimer=100,
	defaultBombRange=1,
	defaultBombNumber=1,
	defaultBombTimeout=10,
	explosionTime=9,
	
	//ai
	leeInterval=5,
	leeRenderNumber,
	
	//probability in getting a bonus in a broken wall in percent
	bonusProbability=50,
	
	//default keys
	keys=[	{	up: 38,
				down: 40,
				right: 39,
				left: 37,
				bomb: 32},
			{	up: 87,
				down: 83,
				right: 68,
				left: 65,
				bomb: 81},
			{	up: 71,
				down: 66,
				right: 78,
				left: 86,
				bomb: 70},
			{	up: 87,
				down: 83,
				right: 68,
				left: 65,
				bomb: 81},
			{	up: 38,
				down: 40,
				right: 39,
				left: 37,
				bomb: 32}],
	pressed=[],
	
	//matrix
	matrix=[],
	level=[	'0 kkakkk   kk  ',
			' akk  kcccc kc ',
			'kakaakaaaaka c ',
			'ka  kka  akakkk',
			' llalaal mmmk b',
			'labbl llmmbbb m',
			'l lblccc mm bmm',
			'bll  bll ammbb ',
			'll b b aaa mbmm',
			' bbb cl mammbb ',
			'  ll lllmammm 5'];
	
//canvases and contexts for rendering
var backgroundCanvas=$k('#backgrounds')[0],
	backgroundContext=backgroundCanvas.getContext('2d'),
	wallCanvas=$k('#walls')[0],
	wallContext=wallCanvas.getContext('2d'),
	animationCanvas=$k('#animations')[0],
	animationContext=animationCanvas.getContext('2d'),
	canvases=$k(backgroundCanvas, wallCanvas, animationCanvas);

//screens and other elements
var pauseScreen=$k('#paused')[0],
	screens=$k('#screens')[0],
	messages=$k('#message')[0];

//images
var images={
		background: 'imgs/grass.png',
		breakable: ['imgs/wood0.jpg',
					'imgs/wood1.jpg',
					'imgs/wood2.jpg',
					'imgs/wood3.jpg',
					'imgs/brick0.jpg'],
		solid: ['imgs/metal0.jpg',
				'imgs/metal1.jpg',
				'imgs/metal2.jpg',
				'imgs/concrete0.jpg',
				'imgs/concrete1.jpg'],
		players: [	{	up: ['imgs/player0up.png'],
						down: ['imgs/player0down.png'],
						right: ['imgs/player0right.png'],
						left: ['imgs/player0left.png'],
						frames: 14},
					{	up: ['imgs/player1up.png'],
						down: ['imgs/player1down.png'],
						right: ['imgs/player1right.png'],
						left: ['imgs/player1left.png'],
						frames: 14},
					{	up: ['imgs/player2up.png'],
						down: ['imgs/player2down.png'],
						right: ['imgs/player2right.png'],
						left: ['imgs/player2left.png'],
						frames: 14},
					{	up: ['imgs/player3up.png'],
						down: ['imgs/player3down.png'],
						right: ['imgs/player3right.png'],
						left: ['imgs/player3left.png'],
						frames: 14},
					{	up: ['imgs/player4up.png'],
						down: ['imgs/player4down.png'],
						right: ['imgs/player4right.png'],
						left: ['imgs/player4left.png'],
						frames: 14},
					{	up: ['imgs/player5up.png'],
						down: ['imgs/player5down.png'],
						right: ['imgs/player5right.png'],
						left: ['imgs/player5left.png'],
						frames: 8},
					{	up: ['imgs/player6up.png'],
						down: ['imgs/player6down.png'],
						right: ['imgs/player6right.png'],
						left: ['imgs/player6left.png'],
						frames: 8},
					{	up: ['imgs/player7up.png'],
						down: ['imgs/player7down.png'],
						right: ['imgs/player7right.png'],
						left: ['imgs/player7left.png'],
						frames: 8},
					{	up: ['imgs/player8up.png'],
						down: ['imgs/player8down.png'],
						right: ['imgs/player8right.png'],
						left: ['imgs/player8left.png'],
						frames: 8},
					{	up: ['imgs/player9up.png'],
						down: ['imgs/player9down.png'],
						right: ['imgs/player9right.png'],
						left: ['imgs/player9left.png'],
						frames: 8}],
		blood: 'imgs/blood.png',
		bomb: 'imgs/bomb.png',
		explosion: ['imgs/exp0.png',
					'imgs/exp1.png',
					'imgs/exp2.png',
					'imgs/exp3.png',
					'imgs/exp4.png',
					'imgs/exp5.png',
					'imgs/exp6.png',
					'imgs/exp7.png',
					'imgs/exp8.png',
					'imgs/exp9.png'],
		bonus: ['imgs/bonus1.png',
				'imgs/bonus2.png',
				'imgs/bonus3.png']
	}

//some event handlers
$(window).resize(resizeCanvases);
$(window).blur(pause);
$('#screens').click(togglePauseState);
$(window).on('keydown', function (event) {
	addKey(event);
	if (event.keyCode==19 || event.keyCode==80) {
		togglePauseState();
	}
});
$(window).on('keyup', function (event) {
	removeKey(event);
});

//add and remove the key to the pressed key reference
function addKey(event) {
	if (!pressed.find(event.keyCode)) {
		pressed.push(event.keyCode);
	}
};

function removeKey(event) {
	pressed.remove(event.keyCode, true);
};

//resize the canvas according to window dimensions
function resizeCanvases() {
	//update the dimensions
	windowWidth=$(window).width();
	windowHeight=$(window).height()-27;
	windowRatio=windowWidth/windowHeight;
	
	//scale to fit according to the width/height ratio
	if (ratio>windowRatio) {
		ppc=windowWidth/width;
		animationCanvas.width=wallCanvas.width=backgroundCanvas.width=windowWidth;
		animationCanvas.height=wallCanvas.height=backgroundCanvas.height=height*ppc;
	}
	else {
		ppc=windowHeight/height;
		animationCanvas.width=wallCanvas.width=backgroundCanvas.width=width*ppc;
		animationCanvas.height=wallCanvas.height=backgroundCanvas.height=windowHeight;
	}
	scale=100/ppc;
	
	//position according to the scaling
	$k(canvases).css('top', (windowHeight-wallCanvas.height)/2+27+'px');
	$k(canvases).css('left', (windowWidth-wallCanvas.width)/2+'px');
	
	render(true, true, true);
};

//return an array containing objects in order of rendering, top to bottom, left to right
function getRenderingOrder() {
	var order=[], i, j, p;
	
	//add the bombs
	for (i=0; i<height; i++) {
		for (j=0; j<width; j++) {
			order.push(matrix[i][j]);
		}
	}
	
	//add the players
	for (i=0; i<players.length; i++) {
		if (players[i]) {
			p=players[i];
			j=0;
			while (j<order.length && (p.x>order[j].x || (p.x==order[j].x && p.y>order[j].y))) {
				j++;
			}
			order.insert(j, p);
		}
	}
	window.order=order;
	return order;
};

//render on each canvas according to arguments
function render(backgrounds, walls, animations) {
	var i, j, k, cell, player, order, object;
	if (backgrounds) {
		backgroundContext.clearRect(0, 0, width*ppc, height*ppc);
		backgroundContext.drawImage(images.background, 0, 0, width*ppc, height*ppc);
	}
	
	//draw walls
	if (walls) {
		
		//clear the canvas
		wallContext.clearRect(0, 0, width*ppc, height*ppc);
		
		//for each cell
		for (i=0; i<height; i++) {
			for (j=0; j<width; j++) {
				
				//save a reference to the cell
				cell=matrix[i][j];
				if (cell.solidWall) {
					wallContext.drawImage(images.solid[cell.solidWall.type], 0, 0, 100, 100, cell.y*ppc, cell.x*ppc, ppc, ppc);
				}
				else if (cell.breakableWall) {
					wallContext.drawImage(images.breakable[cell.breakableWall.type], 0, 0, 100, 100, cell.y*ppc, cell.x*ppc, ppc, ppc);
				}
			}
		}
	}
	if (animations) {
		
		//render players, objects, bombs, etc
		order=getRenderingOrder();
		animationContext.clearRect(0, 0, width*ppc, height*ppc);
		for (i=0; i<order.length; i++) {
			object=order[i];
			if (object instanceof Player) {
				
				//render alive players
				if (object.alive) {
					animationContext.beginPath();
					animationContext.arc(object.y*ppc, object.x*ppc, ppc/7, 0, 2*Math.PI);
					animationContext.closePath();
					animationContext.fill();
					animationContext.drawImage(images.players[object.no][object.lastDirection][0], object.animationFrame*192, 0, 192, 192, object.y*ppc-ppc/2, object.x*ppc-0.8*ppc, ppc, ppc);
				}
				
				//render a blood splatter where the player died
				else {
					animationContext.drawImage(images.blood, 0, 0, 256, 256, object.y*ppc, object.x*ppc, ppc, ppc);
				}
			}
			else if (object instanceof Cell) {
				
				//if the cell has a bomb
				if (object.bomb) {
					animationContext.drawImage(images.bomb, 0, 0, 100, 100, (object.y+0.25)*ppc, (object.x+0.1)*ppc, 0.7*ppc, 0.7*ppc);
				}
				
				//if the cell has explosions
				else if (object.explodedBombs.length) {
					for (k=0; k<object.explodedBombs.length; k++) {
						
						//if it is active, render
						if (object.explodedBombs[k].state>=0) {
							animationContext.drawImage(images.explosion[object.explodedBombs[k].state], 0, 0, 100, 100, object.y*ppc, object.x*ppc, ppc, ppc);
						}
					}
				}
				
				//if the cell has a bonus
				if (object.bonus) {
					animationContext.drawImage(images.bonus[object.bonus.no], 0, 0, 100, 100, object.y*ppc, object.x*ppc, ppc, ppc);
				}
			}
		}
		
		//render wall cells that need to be rendered
		for (i=0; i<renderWalls.length; i++) {
			cell=renderWalls[i];
			wallContext.clearRect(cell.y*ppc, cell.x*ppc, ppc, ppc);
			if (cell.solidWall) {
				wallContext.drawImage(images.solid[cell.solidWall.type], 0, 0, 100, 100, cell.y*ppc, cell.x*ppc, ppc, ppc);
			}
			else if (cell.breakableWall) {
				wallContext.drawImage(images.breakable[cell.breakableWall.type], 0, 0, 100, 100, cell.y*ppc, cell.x*ppc, ppc, ppc);
			}
		}
		renderWalls=[];
	}
	if (!isNaN(leeRenderNumber) && leeRenderNumber>=5 && leeRenderNumber<10) {
		renderLee(leeRenderNumber);
	}
};

function renderLee(no) {
	var i, j, p=players[no], cx=floor(p.x), cy=floor(p.y), path=p.path;
	animationContext.font=ppc/3+'px Arial';
	animationContext.fillStyle='rgba(255, 255, 255, 0.3)';
	animationContext.fillRect(0, 0, width*ppc, height*ppc);
	animationContext.fillStyle='rgba(255, 0, 0, 0.3)';
	for (i=0; i<path.length; i++) {
		animationContext.fillRect(path[i].y*ppc, path[i].x*ppc, ppc, ppc);
	}
	animationContext.fillStyle='#000000';
	for (i=0; i<height; i++) {
		for (j=0; j<width; j++) {
			animationContext.fillText(p.map[i][j], j*ppc, (i+0.3)*ppc+10);
		}
	}
};

//drop bombs and move a player i according to the keys pressed
function actByKeys(i) {
	var p=players[i];
	
	//if the key for dropping bombs is pressed
	if (pressed.find(p.keys.bomb)) {
		if (p.canDropBomb()) {
			p.dropBomb();
		}
	}
	
	//if the keys for movement are pressed
	if (pressed.find(p.keys.up) && !pressed.find(p.keys.down)) {
		p.move(up);
	}
	if (pressed.find(p.keys.down) && !pressed.find(p.keys.up)) {
		p.move(down);
	}
	if (pressed.find(p.keys.right) && !pressed.find(p.keys.left)) {
		p.move(right);
	}
	if (pressed.find(p.keys.left) && !pressed.find(p.keys.right)) {
		p.move(left);
	}
};

function logicStep() {
	var i, j, k, explodedBomb, cell, p;
	
	//move each player
	for (i=0; i<10; i++) {
		if (players[i] && players[i].alive) {
			p=players[i];
			cell=matrix[floor(p.x)][floor(p.y)];
			
			//if player is in an explosion, kill the player
			if (cell.activeExplosions()) {
				p.die();
			}
			else {
				if (p.bombTimeout) {
					p.bombTimeout--;
				}
				
				//if the player was stopped, reset the animation
				if (!p.movedLastStep) {
					p.animationFrame=0;
				}
				
				//reset the flag
				p.movedLastStep=0;
				
				//reset the animation flag for this step
				p.increasedAnimationThisStep=false;
				
				//act according to keys
				if (i<5) {
					actByKeys(i);
				}
				//or use ai
				else {
					p.ai();
				}
				
				//if it went into a bonus cell, apply the bonus
				if (cell.bonus) {
					cell.bonus.apply(p);
					cell.bonus=false;
				}
			}
		}
	}
	
	//take care of each exploded bomb
	for (i=0; i<height; i++) {
		for (j=0; j<width; j++) {
			cell=matrix[i][j];
			if (cell.explodedBombs.length) {
				for (k=0; k<cell.explodedBombs.length; k++) {
					explodedBomb=cell.explodedBombs[k];
					
					//if the explosion starts
					if (explodedBomb.state==0) {
						
						//if there is a bomb there, explode it
						if (cell.bomb) {
							cell.bomb.explode();
						}
						
						//remove the bonus from the cell
						cell.bonus=false;
						
						//if there is a breakable wall, break it and add the cell to the array so the walls are rendered only when needed
						if (cell.breakableWall) {
							cell.breakableWall=false;
							renderWalls.push(cell);
							if (kLib.math.randomInt(0, 101)<bonusProbability) {
								cell.bonus=new Bonus(kLib.math.randomInt(0, 3));
							}
						}
					}
					
					//increase the state of the explosion if possible, else erase the explosion
					if (explodedBomb.state<explosionTime) {
						explodedBomb.state++;
					}
					else {
						explodedBomb.erase();
					}
				}
			}
		}
	}
	
	//take care of each bomb
	for (i=0; i<height; i++) {
		for (j=0; j<width; j++) {
			cell=matrix[i][j];
			if (cell.bomb) {
				
				//if needed, explode the bomb
				if (cell.bomb.timer==0) {
					cell.bomb.explode();
				}
				
				//else decrease the timer
				else {
					cell.bomb.timer--;
				}
			}
		}
	}
};

//execute a step in logics and rendering
function step() {
	//determine framerate
	var date=(new Date).getTime();
	actualFramerate=floor(1000/(date-dateReference));
	dateReference=date;
	if (displayFramerate) {
		cWrite(actualFramerate+'\n'+stepsNumber, true);
	}
	
	endCondition();
	if (playing) {
		logicStep();
		//each 50 steps render all
		render((stepsNumber+40)%50==0, stepsNumber%50==0, true);
		stepsNumber++;
	}
};

//play the game
function play() {
	if (playing===false) {
		hidePauseScreen();
		render(true, true, true);
		intervalReference=setInterval(step, 1/targetFramerate*1000);
		playing=true;
	}
};

//pause the game
function pause() {
	if (playing===true) {
		showPauseScreen();
		clearInterval(intervalReference);
		playing=false;
	}
};

//toggle pause state
function togglePauseState() {
	if (playing) {
		pause();
	}
	else {
		play();
	}
};

//hide and show the pause screen
function showPauseScreen() {
	$k(pauseScreen).css('display', 'table-row');
	$k(screens).css('height', '100%');
};
function hidePauseScreen() {
	$k(pauseScreen).css('display', 'none');
	$k(screens).css('height', 'auto');
};

//preload images
function preloadImages(object) {
	var title, url, i;
	
	//if it is an array
	if (object instanceof Array) {
		for (i=0; i<object.length; i++) {
			//if image
			if ((typeof object[i]=='string') || (object[i] instanceof String)) {
				url=object[i];
				object[i]=new Image();
				object[i].src=url;
			}
			
			//else if array of images
			else if (object[i] instanceof Array || object[i] instanceof Object) {
				preloadImages(object[i]);
			}
		}
	}
	
	//else if object is a basic object
	else if (object instanceof Object) {
		for (title in object) {
			//if image
			if ((typeof object[title]=='string') || (object[title] instanceof String)) {
				url=object[title];
				object[title]=new Image();
				object[title].src=url;
			}
			
			//else if array of images
			else if (object[title] instanceof Array || object[title] instanceof Object) {
				preloadImages(object[title]);
			}
		}
	}
};

//ends the game when the condition is fulfilled (while there are human players)
function endCondition() {
	var i, humans=0, bots=0, no;
	for (i=0; i<5; i++) {
		if (players[i] && players[i].alive) {
			humans++;
		}
	}
	for (i=5; i<10; i++) {
		if (players[i] && players[i].alive) {
			bots++;
		}
	}
	if (humans==0) {
		pause();
		message.innerHTML='You lost!';
	}
	else if (humans==1 && bots==0) {
		pause();
		for (i=0; i<5; i++) {
			if (players[i] && players[i].alive) {
				no=i;
				i=6;
			}
		}
		message.innerHTML='Player '+no+' won!';
	}
};

//return the type of cell based on the code
function typeOfCell(code) {
	if (code==' ') {
		return 'empty';
	}
	if (code=='a' || code=='b' || code=='c' || code=='d' || code=='e') {
		return 'solidWall';
	}
	if (code=='k' || code=='l' || code=='m' || code=='n' || code=='o') {
		return 'breakableWall';
	}
	if (code=='0' || code=='1' || code=='2' || code=='3' || code=='4') {
		return 'humanPlayer';
	}
	if (code=='5' || code=='6' || code=='7' || code=='8' || code=='9') {
		return 'botPlayer';
	}
	return null;
};

//return new solid wall
function SolidWall(code) {
	if (code=='a') {
		this.type=0;
	}
	else if (code=='b') {
		this.type=1;
	}
	else if (code=='c') {
		this.type=2;
	}
	else if (code=='d') {
		this.type=3;
	}
	else if (code=='e') {
		this.type=4;
	}
	else {
		this.type=0;
	}
};

//return new breakable wall
function BreakableWall(code) {
	if (code=='k') {
		this.type=0;
	}
	else if (code=='l') {
		this.type=1;
	}
	else if (code=='m') {
		this.type=2;
	}
	else if (code=='n') {
		this.type=3;
	}
	else if (code=='o') {
		this.type=4;
	}
	else {
		this.type=0;
	}
};

//cell constructor
function Cell(x, y, code) {
	var type=typeOfCell(code);
	
	//coordinates
	this.x=x;
	this.y=y;
	
	//type of cell
	this.code=code;
	
	//walls
	this.empty=(type=='empty' || type=='humanPlayer' || type=='botPlayer') ? true : false;
	this.breakableWall=(type=='breakableWall') ? new BreakableWall(code) : false;
	this.solidWall=(type=='solidWall') ? new SolidWall(code) : false;
	
	//bombs
	this.bomb=false;
	this.explodedBombs=[];
	
	//bonuses
	this.bonus=false;
};

Cell.prototype={

	//change the type of a cell
	changeType: function (code) {
		var type=typeOfCell(code);
		
		//walls
		this.empty=(type=='empty') ? true : false;
		this.breakableWall=(type=='breakableWall') ? new BreakableWall(code) : false;
		this.solidWall=(type=='solidWall') ? new SolidWall(code) : false;
	},
	
	passable: function () {
		if (this.breakableWall || this.solidWall || this.bomb) {
			return false;
		}
		else {
			return true;
		}
	},
	
	//lee must generate a road through breakable walls and bombs
	leePassable: function () {
		if (this.solidWall) {
			return false;
		}
		else {
			return true;
		}
	},
	
	//check if a cell has an explosion started
	activeExplosions: function () {
		var i;
		for (i=0; i<this.explodedBombs.length; i++) {
			if (this.explodedBombs[i].state>=0) {
				return true;
			}
		}
		return false;
	},
	
	//check if a cell is in range of a bomb, where a player is endangered
	inBombRange: function () {
		var x=this.x, y=this.y;
		
		//check current cell
		if (matrix[x][y].bomb || matrix[x][y].explodedBombs.length) {
			return true;
		}
		
		//check for bombs in each direction
		//up
		i=0;
		while (x-i>0 && !matrix[x-i-1][y].bonus && !matrix[x-i][y].breakableWall && !matrix[x-i][y].solidWall) {
			i++;
			//if there is a bomb with range up to this cell, return true
			if (matrix[x-i][y].bomb && matrix[x-i][y].bomb.range>=i) {
				return true;
			}
		}
		//down
		i=0;
		while (x+i<height-1 && !matrix[x+i+1][y].bonus && !matrix[x+i][y].breakableWall && !matrix[x+i][y].solidWall) {
			i++;
			if (matrix[x+i][y].bomb && matrix[x+i][y].bomb.range>=i) {
				return true;
			}
		}
		//right
		i=0;
		while (y+i<width-1 && !matrix[x][y+i+1].bonus && !matrix[x][y+i].breakableWall && !matrix[x][y+i].solidWall) {
			i++;
			if (matrix[x][y+i].bomb && matrix[x][y+i].bomb.range>=i) {
				return true;
			}
		}
		//left
		i=0;
		while (y-i>0 && !matrix[x][y-i-1].bonus && !matrix[x][y-i].breakableWall && !matrix[x][y-i].solidWall) {
			i++;
			if (matrix[x][y-i].bomb && matrix[x][y-i].bomb.range>=i) {
				return true;
			}
		}
		return false;
	}
};

function insideCell(x, y) {
	//for each direction if is inside the matrix
	if (x>=0 && x<height && y>=0 && y<width) {
		return true;
	}
	return false;
};

function enterableCell(x, y) {
	//for each direction if is inside the matrix and on passable cell
	if (insideCell(x, y) && matrix[x][y].passable()) {
		return true;
	}
	return false;
};

//lee must generate a road through breakable walls and bombs
function leeEnterableCell(x, y) {
	//for each direction if is inside the matrix and on passable cell
	if (insideCell(x, y) && matrix[x][y].leePassable()) {
		return true;
	}
	return false;
};

function Bomb(x, y, player) {
	this.player=player;
	this.x=floor(x);
	this.y=floor(y);
	this.timer=(player) ? player.bombTimer : defaultBombTimer;
	this.range=(player) ? player.bombRange : defaultBombRange;
};

Bomb.prototype={
	explode: function() {
		//shortcuts
		var x=this.x, y=this.y, i;
		
		//remove the bomb from the matrix
		matrix[x][y].bomb=false;
		
		//give back the player one bomb
		if (this.player) {
			this.player.bombs++;
		}
		
		//put an explosion where the bomb was and then proceed in each direction while in the matrix
		//and there are no walls, bonuses and bombs and is in the range
		matrix[x][y].explodedBombs.push(new ExplodedBomb(x, y, 0));
		
		//up
		i=0;
		while (x-i>0 && !matrix[x-i][y].bomb && !matrix[x-i][y].bonus && !matrix[x-i][y].breakableWall && !matrix[x-i][y].solidWall && i<this.range) {
			i++;
			//if there is a breakable object, put a bomb there
			if (!matrix[x-i][y].solidWall) {
				matrix[x-i][y].explodedBombs.push(new ExplodedBomb(x-i, y, -i));
			}
		}
		
		//down
		i=0;
		while (x+i<height-1 && !matrix[x+i][y].bomb && !matrix[x+i][y].bonus && !matrix[x+i][y].breakableWall && !matrix[x+i][y].solidWall && i<this.range) {
			i++;
			//if there is a breakable object, put a bomb there
			if (!matrix[x+i][y].solidWall) {
				matrix[x+i][y].explodedBombs.push(new ExplodedBomb(x+i, y, -i));
			}
		}
		
		//right
		i=0;
		while (y+i<width-1 && !matrix[x][y+i].bomb && !matrix[x][y+i].bonus && !matrix[x][y+i].breakableWall && !matrix[x][y+i].solidWall && i<this.range) {
			i++;
			//if there is a breakable object, put a bomb there
			if (!matrix[x][y+i].solidWall) {
				matrix[x][y+i].explodedBombs.push(new ExplodedBomb(x, y+i, -i));
			}
		}
		
		//left
		i=0;
		while (y-i>0 && !matrix[x][y-i].bomb && !matrix[x][y-i].bonus && !matrix[x][y-i].breakableWall && !matrix[x][y-i].solidWall && i<this.range) {
			i++;
			//if there is a breakable object, put a bomb there
			if (!matrix[x][y-i].solidWall) {
				matrix[x][y-i].explodedBombs.push(new ExplodedBomb(x, y-i, -i));
			}
		}
	}
};

function ExplodedBomb(x, y, state) {
	this.x=floor(x);
	this.y=floor(y);
	
	//state of the bomb, 0 is the first animation, negative value means inactive
	this.state=state;
};

ExplodedBomb.prototype={
	erase: function () {
		matrix[this.x][this.y].explodedBombs.remove(this);
	}
};

var bonuses=[
	function (player) {
		player.movement+=0.05;
		player.bombTimer=floor(player.bombTimer*2/3);
	},
	function (player) {
		player.bombRange++;
	},
	function (player) {
		player.bombs++;
	}
];
	
function Bonus(no) {
	this.no=no;
	this.apply=bonuses[no];
};

function Player(no, x, y) {
	var val, i, j;
	
	//number and coordinates
	this.no=no;
	this.x=x;
	this.y=y;
	
	//dead or alive
	this.alive=true;
	
	//movement
	this.movement=defaultMovement;
	this.lastDirection=down;
	this.animationFrame=0;
	this.animationLength=images.players[no].frames;
	this.movedLastStep=false;
	this.increasedAnimationThisStep=false;
	
	//bombs
	this.bombTimer=defaultBombTimer;
	this.bombRange=defaultBombRange;
	this.bombs=defaultBombNumber;
	this.bombTimeout=0;
	
	//ai
	//lee matrix
	this.map=new Array(height);
	for (i=0; i<height; i++) {
		this.map[i]=new Array(width);
		for (j=0; j<width; j++) {
			this.map[i][j]=9999;
		}
	}
	//lee matrix calculation timeout, when this is equal to leeInterval calculate the matrix and path
	this.leeTimeout=this.no;
	//path with movements
	this.path=[];
	this.pathCursor=0;
	this.changePending=false;
	this.urgency=false;
	
	//register default keys
	if (keys[no]) {
		this.keys={};
		for (key in keys[no]) {
			this.keys[key]=keys[no][key];
		}
	}
};

Player.prototype={
	//cell margin distance for each direction
	cellOffset: function (direction) {
		//some shortcuts
		var mx=floor(this.x),
			my=floor(this.y);
			
		if (direction==up) {
			return this.x-mx;
		}
		else if (direction==down) {
			return mx+1-this.x;
		}
		else if (direction==right) {
			return my+1-this.y;
		}
		else if (direction==left) {
			return this.y-my;
		}
	},
	
	//move a player
	move: function (direction) {
		//set the movement flag
		this.movedLastStep=true;
		
		//update position and direction for each case
		if (direction==up) {
			this.x-=this.movableDistance(direction)-epsilon;
			this.lastDirection=up;
		}
		else if (direction==down) {
			this.x+=this.movableDistance(direction)-epsilon;
			this.lastDirection=down;
		}
		else if (direction==right) {
			this.y+=this.movableDistance(direction)-epsilon;
			this.lastDirection=right;
		}
		else if (direction==left) {
			this.y-=this.movableDistance(direction)-epsilon;
			this.lastDirection=left;
		}
		
		//update animation frame if moving in the same direction as last time
		if (this.lastDirection==direction) {
			this.increaseAnimation();
		}
	},
	
	canChangeCell: function (direction) {
		//some shortcuts
		var mx=floor(this.x),
			my=floor(this.y);
			
		//for each direction if is inside the matrix and on passable cell
		if (direction==up && enterableCell(mx-1, my)) {
			return true;
		}
		else if (direction==down && enterableCell(mx+1, my)) {
			return true;
		}
		else if (direction==right && enterableCell(mx, my+1)) {
			return true;
		}
		else if (direction==left && enterableCell(mx, my-1)) {
			return true;
		}
		return false;
	},
	
	movableDistance: function (direction) {
		//some shortcuts
		var mx=floor(this.x),
			my=floor(this.y);
			
		//give distance for each case, based on the model
		if (direction==up) {
			//if the cell in which the player enters is free
			//&& the cell on its left is free or the player has enough left lateral distance
			//&& the cell on its right is free or the player has enough right lateral distance
			//return a full movement
			if (this.canChangeCellFromPosition(up)) {
				return this.movement;
			}
			//else return the maximum possible until you reach the wall (minimum between normal movement and possible movement)
			else {
				return min(this.cellOffset(up)-upLimit, this.movement);
			}
		}
		else if (direction==down) {
			if (this.canChangeCellFromPosition(down)) {
				return this.movement;
			}
			else {
				return min(this.cellOffset(down)-downLimit, this.movement);
			}
		}
		else if (direction==right) {
			if (this.canChangeCellFromPosition(right)) {
				return this.movement;
			}
			else {
				return min(this.cellOffset(right)-rightLimit, this.movement);
			}
		}
		else if (direction==left) {
			if (this.canChangeCellFromPosition(left)) {
				return this.movement;
			}
			else {
				return min(this.cellOffset(left)-leftLimit, this.movement);
			}
		}
	},
	
	//return true if moving in direction a player can change the cell according to its position in the current cell
	canChangeCellFromPosition: function (direction) {
		//some shortcuts
		var mx=floor(this.x),
			my=floor(this.y);
			
		//return for each case, based on the model
		if (direction==up) {
			//if the cell in which the player enters is free
			//&& the cell on its left is free or the player has enough left lateral distance
			//&& the cell on its right is free or the player has enough right lateral distance
			//return true
			if (enterableCell(mx-1, my) && (enterableCell(mx-1, my-1) || this.cellOffset(left)>=leftLimit) && (enterableCell(mx-1, my+1) || this.cellOffset(right)>=rightLimit)) {
				return true;
			}
		}
		else if (direction==down) {
			if (enterableCell(mx+1, my) && (enterableCell(mx+1, my-1) || this.cellOffset(left)>=leftLimit) && (enterableCell(mx+1, my+1) || this.cellOffset(right)>=rightLimit)) {
				return true;
			}
		}
		else if (direction==right) {
			if (enterableCell(mx, my+1) && (enterableCell(mx-1, my+1) || this.cellOffset(up)>=upLimit) && (enterableCell(mx+1, my+1) || this.cellOffset(down)>=downLimit)) {
				return true;
			}
		}
		else if (direction==left) {
			if (enterableCell(mx, my-1) && (enterableCell(mx-1, my-1) || this.cellOffset(up)>=upLimit) && (enterableCell(mx+1, my-1) || this.cellOffset(down)>=downLimit)) {
				return true;
			}
		}
		return false;
	},
	
	//check if a player can drop a bomb based on position and bomb count
	canDropBomb: function () {
		//shortcuts
		var x=floor(this.x), y=floor(this.y);
		
		//if the cell is empty, has no bombs, and the player has bombs, and the wait timeout is over
		if (!matrix[x][y].bomb && matrix[x][y].explodedBombs.length==0 && this.bombs && !this.bombTimeout) {
			return true;
		}
		return false;
	},
	
	dropBomb: function () {
		//shortcuts
		var x=floor(this.x), y=floor(this.y);
		
		//put a bomb in the cell
		matrix[x][y].bomb=new Bomb(x, y, this);
		this.bombs--;
		this.bombTimeout=defaultBombTimeout;
	},
	
	checkedBomb: function () {
		if (this.canDropBomb()) {
			this.dropBomb();
		}
	},
	
	//change the animation frame
	increaseAnimation: function () {
		if (!this.increasedAnimationThisStep) {
			this.animationFrame=(this.animationFrame+1)%this.animationLength;
			this.increasedAnimationThisStep=true;
		}
	},
	
	//die
	die: function () {
		this.alive=false;
		this.x=floor(this.x);
		this.y=floor(this.y);
	},
	
	//fill player's lee matrix
	computeLeeMatrix: function () {
		for (i=0; i<height; i++) {
			for (j=0; j<width; j++) {
				this.map[i][j]=9999;
			}
		}
		lee(this.map, floor(this.x), floor(this.y), 0);
	},
	
	//get a path of cells from the current lee matrix
	computePath: function (x, y, urgency) {
		//player coordinates, map, and map minimum around current cell
		var px=floor(this.x), py=floor(this.y), map=this.map, minimum;
		
		//reset the path array
		this.path=[];
		this.path.push(matrix[x][y]);
		
		//go on completing the path while you haven't reached the starting position
		while (x!=px || y!=py) {
			
			//minimum around current cell
			minimum=min((insideCell(x-1, y) ? map[x-1][y] : 9999),
						(insideCell(x+1, y) ? map[x+1][y] : 9999),
						(insideCell(x, y+1) ? map[x][y+1] : 9999),
						(insideCell(x, y-1) ? map[x][y-1] : 9999));
			
			//if the next cell is inside the matrix, and that cell is not where you come from
			if (insideCell(x-1, y) && map[x-1][y]==minimum) {
				//push the opposite direction in the path because the path goes from player to cell
				this.path.push(matrix[x-1][y]);
				x--;
			}
			else if (insideCell(x+1, y) && map[x+1][y]==minimum) {
				this.path.push(matrix[x+1][y]);
				x++
			}
			else if (insideCell(x, y+1) && map[x][y+1]==minimum) {
				this.path.push(matrix[x][y+1]);
				y++;
			}
			else if (insideCell(x, y-1) && map[x][y-1]==minimum) {
				this.path.push(matrix[x][y-1]);
				y--;
			}
		}
		
		//reverse the array, so that the path is from player to cell
		this.path.reverse();
		
		//reset the lee timeout and cursor
		this.leeTimeout=0;
		this.pathCursor=0;
		this.urgency=urgency;
	},
	
	//general ai
	ai: function () {
		var cx=floor(this.x), cy=floor(this.y), cell;
		
		//situations where there is a need to change the path
		//if the player is in the range of a bomb
		if (matrix[cx][cy].inBombRange()) {
			this.computeLeeMatrix();
			cell=this.closestSafeCell();
			this.computePath(cell.x, cell.y, true);
			this.urgency=true;
			this.continuePath();
		}
		//if close to a bonus
		/*else if (this.bonusNearby()) {
			this.computeLeeMatrix();
			this.computePath();
			//go to the bonus
		}*/
		//if it is the time to get another matrix (each leeInterval number of steps)
		else if (this.leeTimeout>=leeInterval) {
			this.computeLeeMatrix();
			cell=this.closestHumanPlayer();
			this.computePath(cell.x, cell.y);
			this.continuePath();
		}
		
		//situations where the player must continue on the path
		//else continue on path
		else {
			this.leeTimeout++;
			this.continuePath();
			this.urgency=false;
			//if close enough to a player
			if (this.playerInBombingRange()) {
				this.checkedBomb();
			}
		}
	},
	
	//return if a player can find a way to a specific cell
	canGoToCell: function (x, y) {
		if (insideCell(x, y) && this.map[x][y]!=9999) {
			return true;
		}
		return false;
	},
	
	//return the closest safe cell
	closestSafeCell: function () {
		var i, j, cell=matrix[0][0], minimum=9999;
		for (i=0; i<height; i++) {
			for (j=0; j<width; j++) {
				if (this.map[i][j]<minimum && !matrix[i][j].inBombRange()) {
					cell=matrix[i][j];
					minimum=this.map[i][j];
				}
			}
		}
		return cell;
	},
	
	//return the closest live human player cell
	closestHumanPlayer: function () {
		var i, j, cell=matrix[0][0], minimum=9999, player, px, py;
		for (i=0; i<5; i++) {
			player=players[i];
			if (player && player.alive) {
				px=floor(player.x);
				py=floor(player.y);
				if (this.map[px][py]<minimum) {
					cell=matrix[px][py];
					minimum=this.map[px][py];
				}
			}
		}
		return cell;
	},
	
	//make another step on the path just taken
	continuePath: function () {
		var direction, nc, cx=floor(this.x), cy=floor(this.y), nx, ny;
		
		//next cell in path
		nc=this.path[this.path.indexOf(matrix[cx][cy])+1];
		
		//if there is a next cell, i.e. when the player hasn't finished the path
		if (nc) {
			nx=nc.x;
			ny=nc.y;
			
			//get the direction of the cell
			if (cx==nx+1) {
				direction=up;
			}
			if (cx==nx-1) {
				direction=down;
			}
			if (cy==ny-1) {
				direction=right;
			}
			if (cy==ny+1) {
				direction=left;
			}
			
			if (!nc.inBombRange() || this.urgency) {
				//for each direction
				if (direction==up) {
					//if the next cell is free
					if (enterableCell(nx, ny)) {
						//check the left margin, and if the player is not right enough move to the right
						if (!enterableCell(nx, ny-1) && this.cellOffset(left)<=leftLimit) {
							this.move(right);
						}
						//same for the right margin
						else if (!enterableCell(nx, ny+1) && this.cellOffset(right)<=rightLimit) {
							this.move(left);
						}
						//if all ok, go according to direction
						else {
							this.move(up);
						}
					}
					//else drop a bomb so you can get there
					else {
						this.checkedBomb();
					}
				}
				if (direction==down) {
					if (enterableCell(nx, ny)) {
						if (!enterableCell(nx, ny-1) && this.cellOffset(left)<=leftLimit) {
							this.move(right);
						}
						else if (!enterableCell(nx, ny+1) && this.cellOffset(right)<=rightLimit) {
							this.move(left);
						}
						else {
							this.move(down);
						}
					}
					else {
						this.checkedBomb();
					}
				}
				if (direction==right) {
					if (enterableCell(nx, ny)) {
						if (!enterableCell(nx-1, ny) && this.cellOffset(up)<=upLimit) {
							this.move(down);
						}
						else if (!enterableCell(nx+1, ny) && this.cellOffset(down)<=downLimit) {
							this.move(up);
						}
						else {
							this.move(right);
						}
					}
					else {
						this.checkedBomb();
					}
				}
				if (direction==left) {
					if (enterableCell(nx, ny)) {
						if (!enterableCell(nx-1, ny) && this.cellOffset(up)<=upLimit) {
							this.move(down);
						}
						else if (!enterableCell(nx+1, ny) && this.cellOffset(down)<=downLimit) {
							this.move(up);
						}
						else {
							this.move(left);
						}
					}
					else {
						this.checkedBomb();
					}
				}
			}
		}
	},
	
	//check if a player is in range of this one
	playerInBombingRange: function () {
		var x=floor(this.x), y=floor(this.y), px, py;
		
		//for each player
		for (j=0; j<10; j++) {
			if (players[j] && players[j].alive && j!=this.no) {
				p=players[j];
				px=floor(p.x);
				py=floor(p.y);
				
				//check current cell
				if (x==px && y==py) {
					return true;
				}
				
				//check for players in each direction
				//up
				i=0;
				while (x-i>0 && !matrix[x-i][y].bonus && !matrix[x-i][y].breakableWall && !matrix[x-i][y].solidWall && i<this.bombRange) {
					i++;
					//if the coordinate of the checked cell match the ones of the player
					if (x-i==px && y==py) {
						return true;
					}
				}
				//down
				i=0;
				while (x+i<height-1 && !matrix[x+i][y].bonus && !matrix[x+i][y].breakableWall && !matrix[x+i][y].solidWall && i<this.bombRange) {
					i++;
					if (x+i==px && y==py) {
						return true;
					}
				}
				//right
				i=0;
				while (y+i<width-1 && !matrix[x][y+i].bonus && !matrix[x][y+i].breakableWall && !matrix[x][y+i].solidWall && i<this.bombRange) {
					i++;
					if (x==px && y+i==py) {
						return true;
					}
				}
				//left
				i=0;
				while (y-i>0 && !matrix[x][y-i].bonus && !matrix[x][y-i].breakableWall && !matrix[x][y-i].solidWall && i<this.bombRange) {
					i++;
					if (x==px && y-i==py) {
						return true;
					}
				}
			}
		}
		return false;
	}
}

//fill a given map matrix from the coordinates x and y and starting value val
function lee(map, x, y, val) {
	//if the cell on which the player sits is enterable
	if (leeEnterableCell(x, y)) {
		
		//if the cell at x,y is a breakable wall, add 10 to the value, else use a cost of 1
		val+=matrix[x][y].breakableWall ? 10 : 1;
		
		//if this has found a better way
		if (val<map[x][y]) {
			//add the value at the position
			map[x][y]=val;
			
			//apply lee in all directions
			lee(map, x+1, y, val);
			lee(map, x-1, y, val);
			lee(map, x, y+1, val);
			lee(map, x, y-1, val);
		}
	}
};

function addPlayer(player, x, y) {
	player=+player;
	players[player]=new Player(player, x, y);
};

//build a matrix based on a level
function buildLevel(level) {
	var i, j;
	for (i=0; i<height; i++) {
		matrix[i]=[];
		for (j=0; j<width; j++) {
			
			//make each cell
			matrix[i][j]=new Cell(i, j, level[i][j]);
			
			//if it is a digit add a player
			if (level[i][j].match(/^\d$/g)) {
				addPlayer(level[i][j], i+0.5, j+0.5);
			}
		}
	}
};

//initialize the game
function initialize() {
	//first preload images
	preloadImages(images);
	
	//build the level
	buildLevel(level);
	
	//make everything the right size
	resizeCanvases();
};

initialize();
