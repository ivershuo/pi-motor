var gpio = require('pi-gpio');
var motorObj = null;
var STATUS = {
	NOT_READY : -1,
	STARTED   : 1,
	STOPED    : 0
}

/**
 * [Motor 步进电机构造函数]
 * @param {[type]} pins [指定使用的针脚]
 */
function Motor(pins){
	this.pins = pins || [11, 12, 15, 16];
	this.status = STATUS.NOT_READY;
	this.high = 0;

	this._initGpio();
	return this;
}
Motor.STATUS = STATUS;

Motor.prototype = {
	/**
	 * [_initGpio 初始化步进电机]
	 */
	_initGpio : function(){
		var self = this,
			flag = 0;
		this.pins.forEach(function(pin){
			gpio.open(pin, 'out', function(){
				flag += 1;
			});
		});
		motorObj = this;

		var t = setInterval(function(){
			if(flag == 4){
				gpio.write(self.pins[0], 1);
				self.status = Motor.STATUS.STOPED;
				clearInterval(t);
			}
		}, 10);
	},
	/**
	 * [_run 电机运转逻辑]
	 */
	_run : function(){
		var self = this,
			pins = this.pins;

		var _f = function(){
			var interval = 4 * self.speed,
				pin2High = (self.high + ((1 - self.direction) * 2 + 1))%4;

			gpio.write(pins[self.high], 0, function(){
				gpio.write(pins[pin2High], 1);
				self.high = pin2High;
				self._t = setTimeout(_f, interval);
			});
		}
		_f();
	},
	_unexportPins : function(){
		var pins = this.pins;
		gpio.close(pins[0]);
		gpio.close(pins[1]);
		gpio.close(pins[2]);
		gpio.close(pins[3]);

		/*
		function _c(i){
			gpio.close(pins[i], function(){
				i < l && _c(++i);
			});
		}	
		_c(i);
		*/
	},
	/**
	 * [start 启动电机]
	 * @param  {[int]} speed     [速度]
	 * @param  {[mixed]} direction [转向]
	 */
	start : function(speed, direction){
		if(this.status == Motor.STATUS.STARTED){
			return this;
		}

		var self = this;
			this.loop = 20;
		if(this.status == Motor.STATUS.NOT_READY && this.loop){
			this._st = setTimeout(function(){
				self.loop--;
				self.start(speed, direction);
			}, 20);
		} else if(this.status == Motor.STATUS.STOPED) {
			clearTimeout(this._st);

			this.setSpeed(speed);
			this.setDirection(direction);

			this._run();
			this.status = Motor.STATUS.STARTED;
		}

		return this;
	},

	/**
	 * [stop 电机停转]
	 */
	stop : function(){
		if(this.status != Motor.STATUS.STARTED){
			return this;
		}

		clearTimeout(this._t);
		this.status = Motor.STATUS.STOPED;
		return this;
	},

	/**
	 * [off 停止电机]
	 */
	off : function(){
		this.stop();
		this._unexportPins();
	},

	/**
	 * [setSpeed description]
	 * @param {[int]} speed [速度档, 1~10, 1 最快]
	 */
	setSpeed : function(speed){
		this.speed = Math.round(Math.min(10, Math.max(1, speed || 5)));
		return this;
	},

	/**
	 * [setDirection 设置运转方向]
	 * @param {[mixed]} d [方向，0||'0'||'reverse'反转（逆时钟），其他值正转]
	 */
	setDirection : function(d){
		this.direction = (d === 0 || d === '0' || d == 'reverse') ? 0 : 1;
		return this;
	},

	/**
	 * [turn 反转电机运转方向]
	 */
	turn : function(){
		this.direction = 1 - this.direction;
		return this;
	},

	/**
	 * [faster 加快速度]
	 * @param  {[type]} v [增加的档位差，默认增加一档]
	 */
	faster : function(v){
		this.setSpeed(this.speed - (v || 1));
		return this;
	},

	/**
	 * [faster 减慢速度]
	 * @param  {[type]} v [减慢的档位差，默认减慢一档]
	 */
	slower : function(v){
		this.setSpeed(this.speed + (v || 1));
		return this;
	}
}

process.on('exit', function(){
	motorObj && motorObj.status == Motor.STATUS.STARTED && motorObj.off();
});

exports.Motor = Motor;