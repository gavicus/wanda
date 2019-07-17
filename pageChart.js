class PageChart extends Page {
    constructor(oanda){
        super('chart');
        this.oanda = oanda;
        this.context = this.root.getContext('2d');
        this.data = null;
        this.high = 0;
        this.low = 0;
        this.focus = {x:0, y:0};
        this.setupEvents();
        this.shiftDown = false;
        this.instrument = 'EUR_USD';
        this.timeframe = 'W';
        this.instrumentData = null;
        this.hoveredPrice = null;

        this.rezRatio = 3;
        this.styleWidth = 400;
        this.styleHeight = 300;
        this.resizeChart();

        this.vZoom = 1;
        this.hZoom = 10; // = column width

        this.colors = {
            wick: '#000',
            bull: '#2f2',
            bear: '#f22',
            hover: '#fea',
            priceLine: '#999',
            dateZone: '#eee',
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
        
        // this.focus.y, this.vZoom
        this.focus.y = this.high;
        this.vZoom = this.high - this.low;
    }

    init = () => {
        this.requestChartData();
        this.oanda.getInstrumentList(this.initInstrumentList);
        var menu = $('#timeframe-menu');
        var timeframes = ['M','W','D','H1'];
        for(var tf of timeframes){
            var option = document.createElement('option');
            option.setAttribute('value',tf);
            option.textContent = tf;
            menu.append(option);
        }
        menu.on('change',this.onTimeframeChange);
    };

    initChartData = data => {
        this.data = data;
        this.autoCenterChart(data.candles);
        this.show();
    };

    initInstrumentList = data => {
        this.instrumentData = data;
        var menu = $('#instrument-menu');
        this.clearElement(menu);
        for(var instrument of data.instruments){
            var option = document.createElement('option');
            option.setAttribute('value',instrument.name);
            option.textContent = instrument.displayName;
            menu.append(option);
        }
        menu.on('change',this.onInstrumentChange);
        $('#instrument-menu').val(this.instrument);
    };

    onInstrumentChange = event => {
        this.instrument = event.target.value;
        this.requestChartData();
    };

    onTimeframeChange = event => {
        this.timeframe = event.target.value;
        this.requestChartData();
    };

    onKeyDown = event => {
        if(event.key === 'Shift'){
            this.shiftDown = true;
        }
    };

    onKeyUp = event => {
        if(event.key === 'Shift'){
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
        this.hoveredPrice = this.screenToPrice(current.y);
        if(this.mouseDown){
            this.mouseDragged = true;
            
            const delta = {
                x: current.x - this.mouseLast.x,
                y: current.y - this.mouseLast.y
            };
            const range = this.getScreenPriceRange();
            const screenHeight = this.root.height / this.rezRatio;
            const pricePerPixel = range / screenHeight;
            var priceShift = delta.y * pricePerPixel;
            this.focus = {
                x:this.focus.x - delta.x * this.rezRatio,
                y:this.focus.y + priceShift
            };

            this.mouseLast = current;
            this.show();
        } else {
            var candle = this.screenToCandle(current.x);
            this.hoverCandle(candle);
            this.show();
        }
    }

    onMouseOut = event => {
        this.mouseDown = false;
        this.mouseDragged = false;
        $('#chart-message').html('');
    };

    hoverCandle(candle){
        this.hovered = candle;
        if(!candle){ return; }
        var d = new Date(candle.time);
        var dateString = (d.getMonth()+1)+'/'+d.getDate();
        if(this.timeframe.length > 1){
            dateString += ` ${d.getHours()}:${d.getMinutes()}`;
        }
        var message = dateString;
        message += ` o:${candle.mid.o}`;
        message += ` c:${candle.mid.c}`;
        message += ` h:${candle.mid.h}`;
        message += ` l:${candle.mid.l}`;
        message += `   ${this.hoveredPrice.toFixed(5)}`;
        $('#chart-message').html(message);
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
            var perPix = this.getPricePerPixel();
            var zoomChange = delta * perPix;
            this.vZoom += zoomChange;
            this.focus.y += zoomChange / 2;

            const minZoom = 0;
            if(this.vZoom < minZoom){ this.vZoom = minZoom; }
        }
        this.show();
    };

    getPriceAtScreenTop(){
        return this.focus.y;
    }

    getPricePerPixel(){
        return this.getScreenPriceRange() / this.getVisualScreenHeight();
    }

    getVisualScreenHeight(){
        return this.root.height / this.rezRatio;
    }

    getScreenPriceRange(){
        return this.vZoom;
    }

    priceToScreen(price){
        var atTop = this.getPriceAtScreenTop();
        var range = this.getScreenPriceRange();
        var priceBelowHigh = atTop - price;
        var percentDown = priceBelowHigh / range;
        return this.root.height * percentDown;
    }

    screenToPrice(yValue){
        var atTop = this.getPriceAtScreenTop();
        var range = this.getScreenPriceRange();
        var percentDown = yValue / (this.root.height / this.rezRatio);
        return atTop - range * percentDown;

        // de-zoom
        var middle = this.root.height / 2;
        var fromMiddle = yValue - middle;
        yValue = middle + fromMiddle / this.vZoom;

        // de-focus
        yValue += this.focus.y;

        var range = this.high - this.low;
        //var percent = yValue / this.root.height;
        //return this.high - range * percent;
        var h = this.root.height;
        //return range * yValue + range * h + this.low * h;
        return (range*(yValue+h) + h*this.low) / h;
    }

    requestChartData(){
        this.oanda.getChartInfo(
            this.instrument, this.initChartData, this.timeframe
        );
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
        fromRight -= this.focus.x;
        fromRight += this.hZoom / 2;
        var columnFromRight = Math.floor(fromRight / this.hZoom);
        var index = this.data.candles.length - columnFromRight;
        return this.data.candles[index];
    }

    setupEvents(){
        var canvas = this.root;
        this.root.addEventListener('mousedown', this.onMouseDown);
        this.root.addEventListener('mousemove', this.onMouseMove);
        this.root.addEventListener('mouseout', this.onMouseOut);
        this.root.addEventListener('mouseup', this.onMouseUp);
        $(this.root).on('mousewheel', this.onMouseWheel);
        $('body').on('keydown', this.onKeyDown);
        $('body').on('keyup', this.onKeyUp);
        $(document).ready(()=>{
            $('#timeframe-menu').val(this.timeframe);
        });
    }

    show = data => {
        var c = this.context;
        c.fillStyle = '#fafafa';
        c.fillRect(0,0,this.root.width,this.root.height);

        if(data){ this.data = data; }
        else{ data = this.data; }
        if(!data){ return; }
        
        var pricey = this.priceToScreen(this.hoveredPrice);
        c.strokeStyle = this.colors.priceLine;
        c.setLineDash([10,10]);
        c.moveTo(0,pricey);
        c.lineTo(this.root.width, pricey);
        c.stroke();
        c.setLineDash([]);

        var candles = data.candles;
        var columnWidth = this.hZoom;
        var candleWidth = columnWidth * 0.5;
        var colors = this.colors;
        var getX = i => {
            var column = candles.length - i;
            var x = this.root.width - columnWidth * column;
            x -= this.focus.x;
            return x
        }
        var getLeft = i => {
            return getX(i) - (candleWidth/2);
        }
        // time divisions
        var dark = true;
        var startIndex = candles.length - 1;
        var startCandle = candles[candles.length-1];
        var startDate = new Date(startCandle.time);
        c.fillStyle = this.colors.dateZone;
        var differentZone = (a,b) => {
            if(this.timeframe === 'H1'){
                return a.getDate() !== b.getDate();
            }
            if(this.timeframe === 'D'){
                return a.getDay() == 4;
            }
            if(this.timeframe === 'W'){
                return a.getMonth() !== b.getMonth();
            }
            if(this.timeframe === 'M'){
                return a.getYear() !== b.getYear();
            }
            return false;
        }
        for(var i=candles.length-2; i>=0; --i){
            var candle = candles[i];
            var thisDate = new Date(candle.time);
            if(differentZone(thisDate,startDate)){
                if(dark){
                    var left = getLeft(i) + candleWidth * 1.5;
                    var right = getLeft(startIndex) + candleWidth * 1.5;
                    c.fillRect(
                        left,0,right-left,this.root.height
                    );
                }
                dark = !dark;
                startIndex = i;
                startDate = new Date(candles[i].time);
            }
        }
        // candles
        for(var i=candles.length-1; i>=0; --i){
            var candle = candles[i];
            var column = candles.length - i;
            var candleOpen = parseFloat(candle.mid.o);
            var candleClose = parseFloat(candle.mid.c);
            var bodyColor = candleClose > candleOpen
                ? colors.bull
                : colors.bear;
            var wickColor = colors.wick;

            var x = getX(i);
            var left = getLeft(i);
            var right = left + candleWidth;

            // hover bar
            if(candle === this.hovered){
                c.fillStyle = colors.hover;
                c.fillRect(
                    left-1,0,
                    right-left+1,this.root.height
                );
            }

            // wick
            var wickTop = this.priceToScreen(candle.mid.h);
            var wickBot = this.priceToScreen(candle.mid.l);
            c.fillStyle = wickColor;
            c.fillRect(
                x-1,wickTop,
                3,wickBot - wickTop
            );

            // body
            var closeScreen = this.priceToScreen(candle.mid.c);
            var openScreen = this.priceToScreen(candle.mid.o);
            c.fillStyle = bodyColor;
            c.fillRect(
                left, closeScreen,
                candleWidth, openScreen - closeScreen,
            );

            // candle body caps
            c.beginPath();
            c.moveTo(left,openScreen);
            c.lineTo(right,openScreen);
            c.stroke();

            c.beginPath();
            c.moveTo(left,closeScreen);
            c.lineTo(right,closeScreen);
            c.stroke();

            // instrument name
            var fontSize = 40;
            c.font = `100 ${fontSize}px Verdana`;
            c.fillStyle = '#888';
            var text = data.instrument.replace('_',' ');
            text = text.toLowerCase();
            c.fillText(text, 10, fontSize);
        }
    }
}
