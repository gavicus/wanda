class PageChart extends Page {
    constructor(elementId){
        super(elementId);
        this.context = this.root.getContext('2d');
        this.data = null;
        this.high = 0;
        this.low = 0;
        this.focus = {x:0, y:0};
        this.setupEvents();
        this.shiftDown = false;

        this.rezRatio = 2;
        this.styleWidth = 400;
        this.styleHeight = 300;
        this.resizeChart();

        this.vZoom = 1;
        this.hZoom = 6;

        this.colors = {
            wick: '#000',
            bull: '#2f2',
            bear: '#f22',
            hover: '#fea',
        };
    }

    autoCenterChart(candles){
        var high = 0;
        var low = 0;
        for(var candle of candles){
            var candleHigh = parseFloat(candle.mid.h);
            var candleLow = parseFloat(candle.mid.l);
            if(!high || candleHigh > high){ high = candleHigh; }
            if(!low || candleLow < low){ low = candleLow; }
        }
        this.high = high;
        this.low = low;
    }

    init = data => {
        this.data = data;
        this.autoCenterChart(data.candles);
        this.show();
    };

    onKeyDown = event => {
        if(event.key === 'Shift'){
            console.log('Shift down');
            this.shiftDown = true;
        }
    };

    onKeyUp = event => {
        if(event.key === 'Shift'){
            console.log('Shift up');
            this.shiftDown = false;
        }
    };

    onMouseDown = event => {
        this.mouseDown = true;
        this.mouseDownPoint = {x:event.offsetX, y:event.offsetY};
        this.mouseLast = this.mouseDownPoint;
        this.mouseDragged = false;
    };

    onMouseMove = event => {
        var current = {x:event.offsetX, y:event.offsetY};
        if(this.mouseDown){
            this.mouseDragged = true;
            const delta = {
                x: current.x - this.mouseLast.x,
                y: current.y - this.mouseLast.y
            };
            this.focus = {
                x:this.focus.x - delta.x * this.rezRatio,
                y:this.focus.y - delta.y * this.rezRatio
            };
            this.mouseLast = current;
            this.show();
        } else {
            var candle = this.screenToCandle(current.x);
            this.hovered = candle;
            this.show();
        }
    }

    onMouseUp = event => {
        this.mouseDown = false;
        this.mouseDragged = false;
    };

    onMouseWheel = event => {
        event.preventDefault();
        var delta = event.originalEvent.wheelDelta;
        if(this.shiftDown){
            this.hZoom -= delta * 0.05;
            var min = 4;
            if(this.hZoom < min){ this.hZoom = min; }
        } else {
            this.vZoom -= delta * .003;
        }
        this.show();
    };

    priceToScreen(price){
        var range = this.high - this.low;
        var aboveLow = price - this.low;
        var percent = aboveLow / range;
        var screenHeight = this.root.height;
        var pixels = Math.floor(screenHeight * percent);
        var yValue = screenHeight - pixels;
        yValue -= this.focus.y;

        var middle = this.root.height / 2;
        var fromMiddle = yValue - middle;
        yValue = middle + fromMiddle * this.vZoom;

        return yValue;
    }

    resizeChart(){
        $(this.root).css('width',this.styleWidth);
        $(this.root).css('height',this.styleHeight);
        $(this.root).attr('width', this.styleWidth * this.rezRatio);
        $(this.root).attr('height', this.styleHeight * this.rezRatio);
    }

    screenToCandle(xValue){
        if(!this.data){ return null; }
        var fromRight = this.root.width - xValue * this.rezRatio;
        var columnFromRight = Math.floor(fromRight / this.hZoom);
        var index = this.data.candles.length - columnFromRight;
        return this.data.candles[index];
    }

    screenToPrice(yValue){
        var range = this.high - this.low;
        percent = yValue / this.root.height;
        return this.high - range * percent;
    }

    setupEvents(){
        var canvas = this.root;
        this.root.addEventListener('mousedown', this.onMouseDown);
        this.root.addEventListener('mousemove', this.onMouseMove);
        this.root.addEventListener('mouseup', this.onMouseUp);
        $(this.root).on('mousewheel', this.onMouseWheel);
        $('body').on('keydown', this.onKeyDown);
        $('body').on('keyup', this.onKeyUp);
    }

    show = data => {
        var c = this.context;
        c.fillStyle = '#fafafa';
        c.fillRect(0,0,this.root.width,this.root.height);

        if(data){ this.data = data; }
        else{ data = this.data; }
        if(!data){ return; }
        var candles = data.candles;

        var columnWidth = this.hZoom;
        var candleWidth = columnWidth * 0.5;
        var colors = this.colors;
        for(var i=candles.length-1; i>=0; --i){
            var column = candles.length - i;
            var candle = candles[i];
            var candleOpen = parseFloat(candle.mid.o);
            var candleClose = parseFloat(candle.mid.c);
            var bodyColor = candleClose > candleOpen
                ? colors.bull
                : colors.bear;
            var wickColor = colors.wick;

            c.strokeStyle = wickColor;
            var x = this.root.width - columnWidth * column;
            x -= this.focus.x;
            var left = x-(candleWidth/2);
            var right = left + candleWidth;

            if(candle === this.hovered){
                c.fillStyle = colors.hover;
                c.fillRect(
                    left-1,0,
                    right-left+1,this.root.height
                );
            }

            c.beginPath();
            c.moveTo(x,this.priceToScreen(candle.mid.h));
            c.lineTo(x,this.priceToScreen(candle.mid.l));
            c.stroke();

            var closeScreen = this.priceToScreen(candle.mid.c);
            var openScreen = this.priceToScreen(candle.mid.o);
            c.fillStyle = bodyColor;
            c.fillRect(
                left, closeScreen,
                candleWidth, openScreen - closeScreen,
            );

            c.beginPath();
            c.moveTo(left,openScreen);
            c.lineTo(right,openScreen);
            c.stroke();

            c.beginPath();
            c.moveTo(left,closeScreen);
            c.lineTo(right,closeScreen);
            c.stroke();

            c.font = '20px Verdana';
            c.fillStyle = '#888';
            var text = data.instrument.replace('_',' ');
            text = text.toLowerCase();
            c.fillText(text, 10, 20);
        }
    }
}
