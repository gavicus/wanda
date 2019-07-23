class PageChart extends Page {
    constructor(oanda, pageIndicators){
        super('chart');
        this.oanda = oanda;
        this.pageIndicators = pageIndicators;
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
        this.storage = new Storage();
        this.refreshTimer = null;
        this.dataUpdated = null;

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
            priceLine: '#777',
            currentPrice: '#68f',
            dateZone: '#efefef',
        };
        
        this.init();
    }

    autoCenterChart(){
        var candles = this.data.candles;
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
        this.dataUpdated = new Date();
        this.computeIndicators();
        this.autoCenterChart();
        this.show();
    };

    initInstrumentList = data => {
        if(data){
            this.instrumentData = data;
        }
        var pairList = [];
        var stored = this.storage.get('o-instruments');
        if(stored){
            pairList = stored.split(',');
        }else{
            if(data){
                pairList = data.instruments.map(i=>i.name);
            }
        }
        var menu = $('#instrument-menu');
        this.clearElement(menu[0]);
        for(var pair of pairList){
            var option = document.createElement('option');
            option.setAttribute('value',pair);
            option.textContent = pair.replace('_','/');
            menu.append(option);
        }
        menu.on('change',this.onInstrumentChange);
        $('#instrument-menu').val(this.instrument);

        menu.val(pairList[0]);
        this.instrument = pairList[0];
        this.requestChartData();
    };

    onInstrumentChange = event => {
        this.setInstrument(event.target.value);
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

    resetInstrumentList(){
    }

    screenToPrice(yValue){
        var atTop = this.getPriceAtScreenTop();
        var range = this.getScreenPriceRange();
        var percentDown = yValue / (this.root.height / this.rezRatio);
        return atTop - range * percentDown;
        var middle = this.root.height / 2;
        var fromMiddle = yValue - middle;
        yValue = middle + fromMiddle / this.vZoom;
        yValue += this.focus.y;
        var range = this.high - this.low;
        var h = this.root.height;
        return (range*(yValue+h) + h*this.low) / h;
    }

    requestChartData = () => {
        if(this.oanda){
            this.oanda.getChartInfo(
                this.instrument, this.initChartData, this.timeframe
            );
            if(this.refreshTimer){
                clearTimeout(this.refreshTimer);
            }
            var seconds = 60;
            this.refreshTimer = setTimeout(
                this.requestChartData, seconds * 1000
            );
        }
    }

    computeIndicators(){
        var candles = this.data.candles;
        var indicators = this.pageIndicators.indicators;
        for(var indicator of indicators){
            indicator.values = [];
            var name = indicator.getName();
            if(name === 'ma'){
                var periods = parseInt(indicator.get('periods'));
                var pool = [];
                for(var i in candles){
                    pool.push(candles[i]);
                    if(pool.length < periods){ continue; }
                    if(pool.length > periods){ pool.shift(i); }
                    var prices = pool.map(c=>parseFloat(c.mid.c));
                    var sum = prices.reduce((a,b)=>a+b);
                    var avg = sum / pool.length;
                    indicator.values[i] = avg;
                }
            }
        }
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

    setInstrument(name){
        this.instrument = name;
        this.requestChartData();
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

    getX(i) {
        var column = this.data.candles.length - i;
        var x = this.root.width - this.hZoom * column;
        x -= this.focus.x;
        return x
    }

    show = data => {
        
        console.log('show',data);

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
        var getLeft = i => {
            return this.getX(i) - (candleWidth/2);
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
        
        // price line
        var pricey = this.priceToScreen(this.hoveredPrice);
        c.strokeStyle = this.colors.priceLine;
        c.setLineDash([10,10]);
        c.moveTo(0,pricey);
        c.lineTo(this.root.width, pricey);
        c.stroke();
        c.setLineDash([]);

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

            var x = this.getX(i);
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

        // indicators
        var indicators = this.pageIndicators.indicators;
        for(var indicator of indicators){
            if(!indicator.getShown()){ continue; }
            var name = indicator.getName();
            if(name === 'ma'){
                c.beginPath();
                c.lineWidth = 3;
                var first = true;
                for(var i in indicator.values){
                    var avg = indicator.values[i];
                    var x = this.getX(i);
                    var y = this.priceToScreen(avg);
                    c.strokeStyle = '#'+indicator.get('color');
                    if(first){
                        c.moveTo(x,y);
                        first = false;
                    } else { c.lineTo(x,y); }
                }
                c.stroke();
            }
        }

        // current price
        var lastCandle = candles[candles.length-1];
        var currentPrice = lastCandle.mid.c;
        var pricey = this.priceToScreen(currentPrice);
        c.strokeStyle = this.colors.currentPrice;
        c.setLineDash([10,10]);
        c.moveTo(0,pricey);
        c.lineTo(this.root.width, pricey);
        c.stroke();
        c.setLineDash([]);

        var fontSize = 32;
        pricey += fontSize * 1/3;
        c.font = `100 ${fontSize}px Verdana`;
        var message = '' + currentPrice;

        c.fillStyle = '#777';
        var size = c.measureText(message);
        var width = size.width;
        var x = this.root.width - width;
        c.fillRect(x,pricey-fontSize+2,width,fontSize+1);

        c.fillStyle = '#fff';
        c.fillText(message, x, pricey);
    }
}
