(function() {

    var w3c = window.dispatchEvent,
        // https://github.com/RubyLouvre/avalon/blob/master/avalon.js
        fixEvent = function(event) {
            var target = event.target = event.srcElement;
            event.which = event.charCode != null ? event.charCode : event.keyCode;
            if (/mouse|click/.test(event.type)) {
                var doc = target.ownerDocument || document
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
        };

    var EVENT = {
        on: function(ele, name, func, bubble) {
            bind(ele, name, func, bubble)
        },

        off: function(ele, name, func) {
            unbind(ele, name, func, bubble)
        },

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
            w: this.ele.offsetWidth,
            h: this.ele.offsetHeight
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
        this.bindEvts();
    }
    DragMove.prototype = {
        constructor: DragMove,

        bindEvts: function() {
            EVENT.on(this.ele, 'mousedown', this.mousedown.bind(this));
            EVENT.on(document, 'mousemove', this.mousemove.bind(this));
            EVENT.on(document, 'mouseup', this.mouseup.bind(this));
        },

        mousedown: function(e) {
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
            var eleStyle = this.ele.style;
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
            pLeft = Math.round(pLeft);
            pTop = Math.round(pTop);
            eleStyle.top = pTop + 'px';
            eleStyle.left = pLeft + 'px';
            this.pTop = pTop;
            this.pLeft = pLeft;
            this.pW = this.initWH.w;
            this.pH = this.initWH.h;
            this.onMove(pTop, pLeft);
        },

        handlerResize: function(e) {
            var x = e.pageX;
            var y = e.pageY;
            var xy = this.target.getAttribute('data-xy').split(',');
            var X = xy[0] - 0;
            var Y = xy[1] - 0;
            var diffX = (x - this.startPos.x) * X;
            var diffY = (y - this.startPos.y) * Y;
             if (this.lockWHScale) {
                var dx = Math.abs(diffX), 
                    dy = Math.abs(diffY);
                if ((Y > 0 || Y < 0) && X === 0) {
                    diffX = diffY = (diffY >= 0 ? dy : -dy);
                } else {
                    // 目前优先 X
                    diffX = diffY = (diffX >= 0 ? dx : -dx);
                }
            }
            var pW = this.initWH.w;
            var pH = this.initWH.h;
            var pLeft = this.initPos.left;
            var pTop = this.initPos.top;
            var eleStyle = this.ele.style;
            pW += diffX;
            pH += diffY;
            if (X < 0) {
                pLeft -= diffX;
            }
            if (Y < 0) {
                pTop -= diffY;
            }

            var disLeft = false, disTop = false,
                disW = false, disH = false;

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
                var wp = pW / pH, hp = this.initWH.w / this.initWH.h;
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
            pLeft = Math.round(pLeft);
            pTop = Math.round(pTop);
            pW = Math.round(pW);
            pH = Math.round(pH);
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
            EVENT.stop(e);
            this.mousedDown = false;
            this.startPos.x = 0;
            this.startPos.y= 0;
            this.initWH.w = this.pW;
            this.initWH.h = this.pH;
            this.initPos.left = this.pLeft;
            this.initPos.top = this.pTop;
        }
    }

    window.ImageCrop = ImageCrop;
    function ImageCrop(options) {
        this.sourceContainer = options.sourceContainer;
        this.sourceContainer.style.position = 'relative';
        this.sourceImg = new Image();
        this.sourceImg.className = options.imgCls || 'img';
        this.sourceContainer.appendChild(this.sourceImg);
        this.card = getCard(options);
        this.sourceContainer.appendChild(this.card);
        if (options.preImg) {
            this.preContainer = options.preImg.parentElement;
            this.preImg = options.preImg;
        }
        if (options.areaImg) {
            this.areaImgContainer = options.areaImg.parentElement;
            this.areaImg = options.areaImg;
        }
        this.scale = {
            w: 1,
            h: 1
        };
        this.options = options;
        if (!this.options.minHeight) {this.options.minHeight = 20}
        if (!this.options.minWidth) {this.options.minWidth = 20}
        var that = this;
        this.sourceImg.onload = function() {
            setTimeout(function() {
                that.init()
            })
        }
        this.sourceImg.src = options.src;
        this.preImg && (this.preImg.src = options.src);
        this.areaImg && (this.areaImg.src = options.src);
    }

    ImageCrop.prototype = {
        constructor: ImageCrop,

        init: function() {
            // 在ie下 width值是图片默认图片大小
            // 所以这里使用offsetWidth 而不是img.width
            var cw = this.sourceImg.offsetWidth;
            this.cw = cw;
            this.sourceContainer.style.width = cw + 'px';
            var ch = this.sourceImg.offsetHeight;
            this.ch = ch;
            this.sourceContainer.style.height = ch + 'px';
            this.cardMax = {
                minTop: 0,
                minLeft: 0,
                maxTop: ch - this.card.offsetHeight,
                maxLeft: cw - this.card.offsetWidth
            };
            this.bindEvts();
            this.computeScale(this.dragMove.initWH.w, this.dragMove.initWH.h);
        },

        bindEvts: function() {
            this.dragMove = new DragMove(this.card, this.cardMax, {
                w: this.cw,
                h: this.ch,
                minWidth: this.options.minWidth,
                minHeight: this.options.minHeight
            }, {
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
        },

        onResize: function(w, h) {
            this.cardMax.maxTop = this.ch - this.dragMove.pH;
            this.cardMax.maxLeft = this.cw - this.dragMove.pW;
            this.computeScale(w, h);
        },

        computeScale: function(w, h) {
            if (this.preContainer) {
                var scale = this.scale;
                scale.w = w / this.preContainer.offsetWidth;
                scale.h = h / this.preContainer.offsetHeight;
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
            var ret;
            if (this.preImg) {
                ret = {
                    top: parseInt(-this.preImg.style.top),
                    left:  parseInt(-this.preImg.style.left),
                    width: this.preImg.width,
                    height: this.preImg.height
                };
            }
            return ret || {};
        },

        /*
         * 得到裁剪区域位置
         */
        getAreaInfo: function() {
            return {
                top: this.dragMove.pTop,
                left: this.dragMove.pLeft,
                width: this.dragMove.pW,
                height: this.dragMove.pH
            }
        }
    }

    function getCard(options) {
        var div = document.createElement('div');
        div.setAttribute('data-card', true);
        div.style.cssText = 'position:absolute;top:' + (options.top || 0) + 'px;left:' + (options.left || 0) +
            'px;cursor:move;box-sizing:border-box;border:1px dashed #fff;opacity:.5;filter:alpha(opacity=50);background-color:#000;' +
            'z-index:5;width:' + (options.width || 100) + 'px;height:' + (options.height || 100) + 'px;';
        div.innerHTML = createBs();
        return div;
    }

    function createBs() {
        return (
            '<i style="position:absolute;top:-5px;left:-5px;cursor:nw-resize;width:8px;_font-size:0;height:8px;border:1px solid #111;background-color:#fff;z-index:5;" data-xy="-1,-1"></i>' +
            '<i style="position:absolute;top:-5px;left:50%;margin-left:-5px;cursor:n-resize;width:8px;_font-size:0;height:8px;border:1px solid #111;background-color:#fff;z-index:5;" data-xy="0,-1"></i>' +
            '<i style="position:absolute;top:-5px;right:-5px;cursor:sw-resize;width:8px;_font-size:0;height:8px;border:1px solid #111;background-color:#fff;z-index:5;" data-xy="1,-1"></i>' +
            '<i style="position:absolute;top:50%;left:-5px;margin-top:-5px;cursor:e-resize;;width:8px;_font-size:0;height:8px;border:1px solid #111;background-color:#fff;z-index:5;" data-xy="-1,0"></i>' +
            '<i style="position:absolute;top:50%;right:-5px;margin-top:-5px;cursor:e-resize;width:8px;_font-size:0;height:8px;border:1px solid #111;background-color:#fff;z-index:5;" data-xy="1,0"></i>' +
            '<i style="position:absolute;bottom:-5px;left:-5px;cursor:sw-resize;width:8px;_font-size:0;height:8px;border:1px solid #111;background-color:#fff;z-index:5;" data-xy="-1,1"></i>' +
            '<i style="position:absolute;bottom:-5px;left:50%;margin-left:-5px;cursor:n-resize;width:8px;_font-size:0;height:8px;border:1px solid #111;background-color:#fff;z-index:5;" data-xy="0,1"></i>' +
            '<i style="position:absolute;bottom:-5px;right:-5px;cursor:nw-resize;width:8px;_font-size:0;height:8px;border:1px solid #111;background-color:#fff;z-index:5;" data-xy="1,1"></i>' +

            '<i style="position:absolute;top:-5px;left:-5px;background-color:transparent;cursor:n-resize;width:100%;_font-size:0;height:10px;" data-xy="0,-1"></i>' +
            '<i style="position:absolute;top:-5px;right:-5px;background-color:transparent;cursor:e-resize;width:10px;_font-size:0;height:100%;" data-xy="1,0"></i>' +
            '<i style="position:absolute;bottom:-5px;left:-5px;background-color:transparent;cursor:n-resize;width:100%;_font-size:0;height:10px;" data-xy="0,1"></i>' +
            '<i style="position:absolute;top:-5px;left:-5px;background-color:transparent;cursor:e-resize;width:10px;_font-size:0;height:100%;" data-xy="-1,0"></i>'
        );
    }

})();