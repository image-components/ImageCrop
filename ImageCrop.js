;(function(DOC) {
	var w3c = window.dispatchEvent,
		// https://github.com/RubyLouvre/avalon/blob/master/avalon.js
		fixEvent = function(event) {
			var target = event.target = event.srcElement;
			event.which = event.charCode != null ? event.charCode : event.keyCode;
			if (/mouse|click/.test(event.type)) {
				var doc = target.ownerDocument || DOC
				var box = doc.compatMode === "BackCompat" ? doc.body : doc.documentElement
				event.pageX = event.clientX + (box.scrollLeft >> 0) - (box.clientLeft >> 0)
				event.pageY = event.clientY + (box.scrollTop >> 0) - (box.clientTop >> 0)
			}
			event.preventDefault = function() {
				event.returnValue = false
			}
			event.stopPropagation = function() {
				event.cancelBubble = true
			}
			return event
		},
		bind = function(ele, name, func, bubble) {
			function callback(e) {
				var ex = e.target ? e : fixEvent(e || window.event)
				var ret = func.call(ele, e)
				if (ret === false) {
					ex.preventDefault()
					ex.stopPropagation()
				}
				return ret
			}
			if (w3c) {
				ele.addEventListener(name, callback, !!bubble)
			} else {
				try {
					ele.attachEvent("on" + name, callback)
				} catch (e) {}
			}
			return callback;
		},
		unbind = w3c ? function(ele, name, func, bubble) {
			ele.removeEventListener(name, func, !!bubble)
		} : function(ele, name, func) {
			ele.detachEvent('on' + name, func)
		},
		// 参照jquery实现
		// http://code.jquery.com/jquery-1.10.2.js
		offset = function(elem) {
			var docElem, win,
				box = {top: 0, left: 0},
				doc = elem && elem.ownerDocument;
			if (!doc) return;
			docElem = doc.documentElement;
			// If we don't have gBCR, just use 0,0 rather than error
			// BlackBerry 5, iOS 3 (original iPhone)
			if (typeof elem.getBoundingClientRect !== 'undefined') {
				box = elem.getBoundingClientRect();
			}
			win = doc.nodeType === 9 ? doc.defaultView || doc.parentWindow : false;
			return {
				top: box.top  + (win.pageYOffset || docElem.scrollTop)  - (docElem.clientTop  || 0),
				left: box.left + (win.pageXOffset || docElem.scrollLeft) - (docElem.clientLeft || 0)
			};
		};

	var EVENT = {
		on: bind,
		off: unbind,
		stop: function(e) {
			e.stopPropagation();
			e.preventDefault();
		}
	};

	if (!bind.bind) {
		Function.prototype.bind = function(context) {
			var that = this;
			var args = Array.prototype.slice.call(arguments, 1);
			return function() {
				var ars = args.concat();
				ars.push.apply(ars, arguments)
				return that.apply(context, ars);
			};
		};
	}

	function DragMove(ele, areaMax, Max, options) {
		this.ele = ele;
		this.mousedDown = false;
		this.areaMax = areaMax;
		this.Max = Max;
		this.initPos = {
			left: 0,
			top: 0
		};
		this.initWH = {
			w: this.ele.offsetWidth || parseInt(this.ele.style.width),
			h: this.ele.offsetHeight || parseInt(this.ele.style.height)
		};
		this.startPos = {
			x: 0,
			y: 0
		};
		this.onMove = options.onMove;
		this.onResize = options.onResize;
		this.minWidth = options.minWidth || 20;
		this.minHeight = options.minHeight || 20;
		this.lockWHScale = options.lockWHScale;
		this.pTop = this.pLeft = 0;
		this.bindEvts();
	}
	DragMove.prototype = {
		constructor: DragMove,

		bindEvts: function() {
			this._mousedown = EVENT.on(this.ele, 'mousedown', this.mousedown.bind(this));
		},

		mousedown: function(e) {
			this._mousemove = EVENT.on(DOC, 'mousemove', this.mousemove.bind(this));
			this._mouseup = EVENT.on(DOC, 'mouseup', this.mouseup.bind(this));
			EVENT.stop(e);
			this.mousedDown = true;  
			this.target = e.target;
			this.startPos.x = e.pageX;
			this.startPos.y= e.pageY;
		},

		mousemove: function(e) {
			EVENT.stop(e);
			if (this.mousedDown) {
				if (this.target.getAttribute('data-card')) {
					this.handlerMove(e);
				} else if (this.target.tagName.toLowerCase() === 'i') {
					this.handlerResize(e);
				}
			}
			return false;
		},

		handlerMove: function(e) {
			var x = e.pageX;
			var y = e.pageY;
			var pLeft = this.initPos.left;
			var pTop = this.initPos.top;
			pLeft += (x - this.startPos.x);
			pTop += (y - this.startPos.y)
			if (pLeft > this.areaMax.maxLeft) {
				pLeft = this.areaMax.maxLeft;
			} else if (pLeft < this.areaMax.minLeft) {
				pLeft = this.areaMax.minLeft;
			}

			if (pTop > this.areaMax.maxTop) {
				pTop = this.areaMax.maxTop;
			} else if (pTop < this.areaMax.minTop) {
				pTop = this.areaMax.minTop;
			}
			this.moveTo(pTop, pLeft);
		},

		moveTo: function(pTop, pLeft) {
			var eleStyle = this.ele.style;
			eleStyle.top = pTop + 'px';
			eleStyle.left = pLeft + 'px';
			this.pTop = pTop;
			this.pLeft = pLeft;
			this.pW = this.initWH.w;
			this.pH = this.initWH.h;
			this.onMove(pTop, pLeft);
		},

		handlerResize: function(e) {
			var x = e.pageX, y = e.pageY, 
				xy = this.target && this.target.getAttribute('data-xy').split(',') || [1, 1],
				X = xy[0] - 0, Y = xy[1] - 0,
				diffX = (x - this.startPos.x) * X, diffY = (y - this.startPos.y) * Y,
				pW = this.initWH.w, pH = this.initWH.h,
				pLeft = this.initPos.left, pTop = this.initPos.top,
				disLeft = false, disTop = false, disW = false, disH = false,
				eleStyle = this.ele.style, dx, dy;
			 if (this.lockWHScale) {
				dx = Math.abs(diffX), dy = Math.abs(diffY);
				if ((Y > 0 || Y < 0) && X === 0) {
					diffX = diffY = (diffY >= 0 ? dy : -dy);
				} else {
					// 目前优先 X
					diffX = diffY = (diffX >= 0 ? dx : -dx);
				}
			}
			pW += diffX;
			pH += diffY;
			if (X < 0) pLeft -= diffX;
			if (Y < 0) pTop -= diffY;

			if (pLeft > (this.Max.w - this.minWidth)) {
				pW += (pLeft - this.areaMax.maxLeft);
				pLeft = this.areaMax.maxLeft;
				disLeft = true;
			} else if (pLeft < this.areaMax.minLeft) {
				pW += (pLeft - this.areaMax.minLeft);
				pLeft = this.areaMax.minLeft;
				disLeft = true;
			}
			if (pTop > (this.Max.h - this.minHeight)) {
				pH += (pTop - this.areaMax.maxTop);
				pTop = this.areaMax.maxTop;
				disTop = true;
			} else if (pTop < this.areaMax.minTop) {
				pH += (pTop - this.areaMax.minTop);
				pTop = this.areaMax.minTop;
				disTop = true;
			}
			if (pW + pLeft > this.Max.w) {
				pW = this.Max.w - pLeft;
				disW = true;
			} else if (pW < this.minWidth) {
				if (X < 0) {
					pLeft += (pW - this.minWidth);
				} else {
					disW = true;
				} 
				pW = this.minWidth;
			}
			if (pH + pTop > this.Max.h) {
				pH = this.Max.h - pTop;
				disH = true;
			} else if (pH < this.minHeight) {
				if (Y < 0) {
					pTop += (pH - this.minHeight);
				} else {
					disH = true;
				} 
				pH = this.minHeight;
			}
			if (this.lockWHScale) {
				var pw = pW, ph = pH, wp = pW / pH, hp = this.initWH.w / this.initWH.h;
				if (wp >= hp) {
					pW = pH * hp;
					if (X < 0) {
						pLeft -= (pW - pw);
					}
				} else if (wp < hp) {
					pH = pW * this.initWH.h / this.initWH.w;
					if (Y < 0) {
						pTop -= (pH - ph);
					}
				}
			}
			if (!disW) {
				eleStyle.left = pLeft + 'px';
				this.pLeft = pLeft;
			}
			if (!disH) {
				eleStyle.top = pTop + 'px';
				this.pTop = pTop;
			}
			eleStyle.width = pW + 'px';
			this.pW = pW;
			eleStyle.height = pH + 'px';
			this.pH = pH;
			if (!disLeft || !disTop) {
				this.onResize(this.pW, this.pH);
			}
			this.onMove(this.pTop, this.pLeft);
		},

		mouseup: function(e) {
			e && EVENT.stop(e);
			this.mousedDown = false;
			this.startPos.x = 0;
			this.startPos.y= 0;
			this.initWH.w = this.pW;
			this.initWH.h = this.pH;
			this.initPos.left = this.pLeft;
			this.initPos.top = this.pTop;
			this._mousemove && EVENT.off(DOC, 'mousemove', this._mousemove);
			this._mouseup && EVENT.off(DOC, 'mouseup', this._mouseup);
			this._mousemove = null;
			this._mouseup = null;
		},

		destroy: function() {
			EVENT.off(this.ele, 'mousedown', this._mousedown);
			this.ele = null;
		}
	}

	window.ImageCrop = ImageCrop;
	function ImageCrop(options) {
		this.sourceContainer = options.sourceContainer;
		this.sourceContainer.style.position = 'relative';
		initStyles.call(this, options);
		this.options = options;
		if (!this.options.minHeight) {this.options.minHeight = 20}
		if (!this.options.minWidth) {this.options.minWidth = 20}
		if (!this.options.minImgHeight) {this.options.minImgHeight = 150}
		if (!this.options.minImgWidth) {this.options.minImgWidth = 150}
		if (typeof this.options.defaultCenter == 'undefined')  this.options.defaultCenter = true;
		this.initImage();
	}

	function initStyles(options) {
		if (options.preImg) iStyle.call(this, 'preImg', options);
		if (options.areaImg) iStyle.call(this, 'areaImg', options)
	}

	function iStyle(c, options) {
		var cstyle = (this[c + 'Container'] = options[c].parentElement).style;
		cstyle.position = 'relative';
		cstyle.overflow = 'hidden';
		this[c] = options[c];
		this[c].style.position = 'absolute';
	}

	ImageCrop.prototype = {

		constructor: ImageCrop,

		initImage: function() {
			var that = this;
			try {
				if (this.sourceImg) {
					this.sourceContainer.removeChild(this.sourceImg);
				}
				if (this.card) {
					this.sourceContainer.removeChild(this.card);
				}
			} catch (e) {}
			this.card = getCard(this.options);
			this.scale = {w: 1, h: 1};
			this.sourceImg = new Image();
			this.sourceImg.onload = function() {
				that.originWidth = that.sourceImg.width;
				that.originHeight = that.sourceImg.height;
				that.sourceImg.className = that.options.imgCls || 'img';
				that.sourceContainer.appendChild(that.sourceImg);
				setTimeout(function() {
					that.init()
				})
			}
			this.sourceImg.src = this.options.src;
			this.preImg && (this.preImg.src = this.options.src);
			this.areaImg && (this.areaImg.src = this.options.src);
		},

		changeImage: function(src) {
			this.options.src = src;
			this.initImage();
		},

		checkImg: function() {
			// 在ie下 width值是图片默认图片大小
			// 所以这里使用offsetWidth 而不是img.width
			var cw = this.sourceImg.offsetWidth;
			var ch = this.sourceImg.offsetHeight;
			var _cw = cw, _ch = ch;
			if (cw < this.options.minImgWidth) {
				// 此时图片宽度比较小
				_ch = Math.round(this.options.minImgWidth / cw * ch);
				_cw = this.options.minImgWidth;
			}
			if (_ch < this.options.minImgHeight) {
				// 此时图片高度比较小
				_cw = Math.round(this.options.minImgHeight / _ch * _cw);
				_ch = this.options.minImgHeight;
			}
			this.sourceImg.style.width = this.sourceContainer.style.width = _cw + 'px';
			this.sourceImg.style.height = this.sourceContainer.style.height = _ch + 'px';
			// 再次check
			var _cw_ = this.sourceImg.offsetWidth;
			var _ch_ = this.sourceImg.offsetHeight;
			if (_cw_ < _cw) {
				cw = _cw = _cw_;
				_ch = ch;
				this.sourceContainer.style.width = cw + 'px';
				this.sourceImg.style.height = _ch + 'px';
			}
			if (_ch_ < _ch) {
				ch = _ch = _ch_;
				_cw = cw;
				this.sourceContainer.style.height = ch + 'px';
				this.sourceImg.style.width = _cw + 'px';
			}
			this.cw = _cw;
			this.ch = _ch;
		},

		init: function() {
			this.options.onInit && this.options.onInit.call(this);
			this.checkImg();
			this.cardMax = {
				minTop: 0,
				minLeft: 0,
				maxTop: this.ch - this.options.height,
				maxLeft: this.cw - this.options.width
			};
			var mt = this.cardMax.maxTop,
				ml = this.cardMax.maxLeft,
				offs = offset(this.sourceImg),
				dS = {pageX: 0, pageY: 0};
			if (mt < 0) this.cardMax.maxTop = 0;
			if (ml < 0) this.cardMax.maxLeft = 0;
			this.bindEvts();
			if (mt < 0 || ml < 0) {
				dS.pageX = (offs.left + this.cw) * 2;
				dS.pageY = (offs.top + this.ch) * 2;
			}
			this.dragMove.initPos.left = this.options.left;
			this.dragMove.initPos.top = this.options.top;
			this.dragMove.handlerResize(dS);
			this.sourceContainer.appendChild(this.card);
			if (this.options.defaultCenter) {
				// 是否默认显示在中心
				this.dragMove.moveTo(this.ch / 2 - this.dragMove.pH / 2, this.cw / 2 - this.dragMove.pW / 2);
			}
			this.dragMove.mouseup();
		},

		bindEvts: function() {
			if (this.dragMove) {
				this.dragMove.destroy();
			}
			this.dragMove = new DragMove(this.card, this.cardMax, {
				w: this.cw,
				h: this.ch
			}, {
				minWidth: this.options.minWidth,
				minHeight: this.options.minHeight,
				onMove: this.onMove.bind(this),
				onResize: this.onResize.bind(this),
				lockWHScale: this.options.lockWHScale
			});
		},

		onMove: function(top, left) {
			if (this.preImg) {
				var style = this.preImg.style;
				style.top = Math.round((-top / this.scale.h), 10) + 'px';
				style.left = Math.round((-left / this.scale.w), 10) + 'px';
			}
			if (this.areaImg) {
				style = this.areaImg.style;
				style.top = Math.round(-top) + 'px';
				style.left = Math.round(-left) + 'px';
			}
			if (this.options.onMove) this.options.onMove.call(this, top, left, this.dragMove.pH, this.dragMove.pW);
		},

		onResize: function(w, h) {
			this.cardMax.maxTop = this.ch - this.dragMove.pH;
			this.cardMax.maxLeft = this.cw - this.dragMove.pW;
			this.computeScale(w, h);
		},

		computeScale: function(w, h) {
			if (this.preImgContainer) {
				this.scale.w = w / this.preImgContainer.offsetWidth;
				this.scale.h = h / this.preImgContainer.offsetHeight;
			}
			this.resize(w, h)
		},

		resize: function(w, h) {
			if (this.preImg) {
				this.preImg.width = Math.round(this.cw / this.scale.w);
				this.preImg.height = Math.round(this.ch / this.scale.h);
			}
			if (this.areaImg) {
				this.areaImg.width = this.cw;
				this.areaImg.height = this.ch;

				var style = this.areaImgContainer.style;
				style.width = w + 'px';
				style.height = h + 'px';
			}
		},

		/*
		 * 得到当前裁剪位置
		 */
		getPreInfo: function() {
			if (this.preImg) {
				return {
					top: -parseInt(this.preImg.style.top),
					left:  -parseInt(this.preImg.style.left),
					width: this.preImg.width,
					height: this.preImg.height
				}
			}
			return {}
		},

		/*
		 * 得到裁剪区域位置
		 */
		getAreaInfo: function() {
			if (!this.dragMove) return {};
			return {
				top: this.dragMove.pTop,
				left: this.dragMove.pLeft,
				width: this.dragMove.pW,
				height: this.dragMove.pH
			}
		},

		/*
		 * 得到相对于图片原始大小时位置
		 */
		getOriginInfo: function() {
			if (!this.dragMove) return {};
			var scaleX = this.originWidth / this.cw, scaleY = this.originHeight / this.ch;
			return {
				top: Math.round(this.dragMove.pTop * scaleY),
				left: Math.round(this.dragMove.pLeft * scaleX),
				width: Math.round(this.dragMove.pW * scaleX),
				height: Math.round(this.dragMove.pH * scaleY)
			}
		}
	}

	function getCard(options) {
		var div = document.createElement('div');
		div.setAttribute('data-card', true);
		options.top || (options.top = 0);
		options.left || (options.left = 0);
		options.width || (options.width = 100);
		options.height || (options.height = 100);
		div.style.cssText = 'position:absolute;top:' + options.top + 'px;left:' + options.left +
			'px;cursor:move;box-sizing:border-box;border:1px dashed #fff;opacity:.5;filter:alpha(opacity=50);background-color:#000;' +
			'z-index:5;width:' + options.width + 'px;height:' + options.height + 'px;';
		div.innerHTML = createBs();
		return div;
	}

	function createBs() {
		return (
			'<i style="position:absolute;top:0;left:0;cursor:nw-resize;width:5px;_font-size:0;height:5px;border:1px solid #111;background-color:#fff;z-index:5;" data-xy="-1,-1"></i>' +
			'<i style="position:absolute;top:0;left:50%;margin-left:-2.5px;cursor:n-resize;width:5px;_font-size:0;height:5px;border:1px solid #111;background-color:#fff;z-index:5;" data-xy="0,-1"></i>' +
			'<i style="position:absolute;top:0;right:-0;cursor:sw-resize;width:5px;_font-size:0;height:5px;border:1px solid #111;background-color:#fff;z-index:5;" data-xy="1,-1"></i>' +
			'<i style="position:absolute;top:50%;left:0;margin-top:-2.5px;cursor:e-resize;;width:5px;_font-size:0;height:5px;border:1px solid #111;background-color:#fff;z-index:5;" data-xy="-1,0"></i>' +
			'<i style="position:absolute;top:50%;right:0;margin-top:-2.5px;cursor:e-resize;width:5px;_font-size:0;height:5px;border:1px solid #111;background-color:#fff;z-index:5;" data-xy="1,0"></i>' +
			'<i style="position:absolute;bottom:0;left:0;cursor:sw-resize;width:5px;_font-size:0;height:5px;border:1px solid #111;background-color:#fff;z-index:5;" data-xy="-1,1"></i>' +
			'<i style="position:absolute;bottom:0;left:50%;margin-left:-2.5px;cursor:n-resize;width:5px;_font-size:0;height:5px;border:1px solid #111;background-color:#fff;z-index:5;" data-xy="0,1"></i>' +
			'<i style="position:absolute;bottom:0;right:0;cursor:nw-resize;width:5px;_font-size:0;height:5px;border:1px solid #111;background-color:#fff;z-index:5;" data-xy="1,1"></i>' +

			'<i style="position:absolute;top:0;left:0;background-color:transparent;cursor:n-resize;width:100%;_font-size:0;height:6px;" data-xy="0,-1"></i>' +
			'<i style="position:absolute;top:0;right:0;background-color:transparent;cursor:e-resize;width:6px;_font-size:0;height:100%;" data-xy="1,0"></i>' +
			'<i style="position:absolute;bottom:0;left:0;background-color:transparent;cursor:n-resize;width:100%;_font-size:0;height:6px;" data-xy="0,1"></i>' +
			'<i style="position:absolute;top:0;left:0;background-color:transparent;cursor:e-resize;width:6px;_font-size:0;height:100%;" data-xy="-1,0"></i>'
		);
	}

	if (typeof module === 'object' && module && typeof module.exports === 'object') {
		module.exports = ImageCrop;
	} else {
		if (typeof define === 'function' && define.amd) {
			define([], function() { return ImageCrop; });
		}
	}
})(document);
