class PageChart extends Page {
    constructor(oanda, pageIndicators){
        super('chart');

        this.chartSource = new ChartSource(oanda);
        this.chartData = null;

        this.pageIndicators = pageIndicators;
        this.context = this.root.getContext('2d');
        this.data = null;
        this.accountData = null;
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
        this.drawingTool = null;
        this.drawingMode = false;

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
            darkGreen: '#090',
            darkRed: '#b00',
        };

        this.drawings = [];
        this.drawingsCookieName = 'o-drawings';
        this.currentDrawing = null;
        this.readDrawings();
        
        this.instrumentListInitialized = false;
        this.init();
    }

    addDrawing(){
        this.drawings.push(this.currentDrawing);
        this.currentDrawing = null;
        this.writeDrawings();
        this.show();
    }

    readDrawings(){
        let cookie = this.storage.get(this.drawingsCookieName);
        this.drawings = this.cookieToDrawings(cookie);
    }

    cookieToDrawings(cookie){
        let drawings = [];
        const cookies = cookie.split('|');
        for(let cookie of cookies){
            let drawing = {};
            let fields = cookie.split(',');
            for(let field of fields){
                let [key,value] = field.split(':');
                drawing[key] = value.replace(/&colon;/g, ':');
            }
            drawings.push(drawing);
        }
        return drawings;
    }

    drawingsToCookie(){
        let cookies = [];
        for(let drawing of this.drawings){
            let cookie = 'type:'+drawing.type;
            cookie += ',pair:'+this.instrument;
            cookie += ',color:'+drawing.color;
            if(drawing.type === 'horiz'){
                cookie += ',price:'+drawing.price;
            } else if(drawing.type === 'trend'){
                cookie += ',timeframe:'+drawing.timeframe;
                cookie += ',startPrice:'+drawing.startPrice;
                cookie += ',startTime:'
                    +drawing.startTime.replace(/:/g, '&colon;');
                cookie += ',endPrice:'+drawing.endPrice;
                cookie += ',endTime:'
                    +drawing.endTime.replace(/:/g, '&colon;');
            }
            cookies.push(cookie);
        }
        return cookies.join('|');
    }

    writeDrawings(){
        const cookie = this.drawingsToCookie();
        this.storage.set(this.drawingsCookieName, cookie);
    }

    autoCenterChart(){
        var candles = this.chartData.candles;
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
        
        this.focus.y = this.high;
        this.vZoom = this.high - this.low;
    }

    updateChartData(){
        this.chartSource.getChartData(
            this.instrument, this.timeframe, this.initChartData
        );
    }

    init = () => {
        this.updateChartData();
        var menu = $('#timeframe-menu');
        var timeframes = ['M','W','D','H1'];
        for(var tf of timeframes){
            var option = document.createElement('option');
            option.setAttribute('value',tf);
            option.textContent = tf;
            menu.append(option);
        }
        menu.on('change',this.onTimeframeChange);

        this.initTradeForm();
    };

    initTradeForm(){
        const tradeForm = document.createElement('div');
        tradeForm.setAttribute('id','trade-form');

        const longShort = document.createElement('button');
        longShort.textContent = 'long';
        longShort.style.color = this.colors.darkGreen;
        $(longShort).on('click',this.onBtnLongShort);
        tradeForm.append(longShort);

        const priceField = document.createElement('div');
        priceField.setAttribute('class','form-field');
        priceField.textContent = 'price';
        const priceInput = document.createElement('input');
        priceInput.setAttribute('id','price-input');
        priceInput.setAttribute('class','short-input');
        priceField.append(priceInput);
        const priceButton = document.createElement('button');
        priceButton.textContent = 'chart';
        priceField.append(priceButton);
        tradeForm.append(priceField);

        const chartWrapper = $('#chart-wrapper');
        chartWrapper.append(tradeForm);
        $(tradeForm).hide();
    }

    initChartData = data => {
        this.chartData = data;
        if(this.chartData){
            this.dataUpdated = new Date();
            this.initInstrumentList();
            this.computeIndicators();
            this.autoCenterChart();
            this.show();
        }
    };

    initInstrumentList = () => {
        if(this.instrumentListInitialized){ return; }
        this.instrumentListInitialized = true;
        var pairList = [];
        var stored = this.storage.get('o-instruments');
        if(stored){
            pairList = stored.split(',');
        }else{
            pairList = this.chartData.instruments.map(i=>i.name);
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
    };

    onInstrumentChange = event => {
        this.setInstrument(event.target.value);
    };

    onTimeframeChange = event => {
        this.timeframe = event.target.value;
        this.updateChartData();
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
        if(this.drawingMode){
            this.mouseDown = false;
            this.mouseDragged = false;
            return;
        }
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

    createDrawing(where){
        if(this.drawingTool.tool === 'horiz'){
            const price = this.screenToPrice(where.y);
            this.currentDrawing = {
                pair: this.instrument,
                type: this.drawingTool.tool,
                color: '#'+this.drawingTool.color,
                price: price,
            };
            this.addDrawing();
            this.drawingMode = false;
        }
        if(this.drawingTool.tool === 'trend'){
            const price = this.screenToPrice(where.y);
            const candle = this.screenToCandle(where.x);
            const time = candle.time;
            if(this.currentDrawing){
                this.currentDrawing['endPrice'] = price;
                this.currentDrawing['endTime'] = time;
                this.addDrawing();
                this.drawingMode = false;
            } else {
                this.currentDrawing = {
                    pair: this.instrument,
                    type: this.drawingTool.tool,
                    timeframe: this.timeframe,
                    color: '#'+this.drawingTool.color,
                    startPrice: price,
                    startTime: time,
                };
            }
        }
    }

    onMouseUp = event => {
        this.mouseDown = false;
        this.mouseDragged = false;
        const where = {x:event.offsetX, y:event.offsetY};
        if(this.drawingMode){
            this.createDrawing(where);
        }
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
        var middle = this.root.height / 2;
        var fromMiddle = yValue - middle;
        yValue = middle + fromMiddle / this.vZoom;
        yValue += this.focus.y;
        var range = this.high - this.low;
        var h = this.root.height;
        return (range*(yValue+h) + h*this.low) / h;
    }
    
    getAccountTradeInfo(){
        if(this.accountData.trades){
            const trade = this.accountData.trades.find(
                t => t.instrument === this.instrument
            );
            if(trade){
                const orders = this.accountData.orders.find(
                    o => o.tradeId === trade.id
                );
                const info = {trade:trade[0], orders:orders};
                return info;
            }
        }
        return null;
    }

    computeIndicators(){
        var candles = this.chartData.candles;
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
        if(!this.chartData){ return null; }
        var fromRight = this.root.width - xValue * this.rezRatio;
        fromRight -= this.focus.x;
        fromRight += this.hZoom / 2;
        var columnFromRight = Math.floor(fromRight / this.hZoom);
        var index = this.chartData.candles.length - columnFromRight;
        return this.chartData.candles[index];
    }

    setInstrument(name){
        this.instrument = name;
        this.updateChartData();
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
    
    candleToScreen(candle){
        let index = this.chartData.candles.indexOf(candle);
        return this.getX(index);
    }

    getX(i) {
        var column = this.chartData.candles.length - i;
        var x = this.root.width - this.hZoom * column;
        x -= this.focus.x;
        return x
    }

    show = () => {
        var c = this.context;
        c.fillStyle = '#fafafa';
        c.fillRect(0,0,this.root.width,this.root.height);

        var candles = this.chartData.candles;
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
        
        // hover line
        if(!this.drawingMode){
            this.showPriceLine(
                this.hoveredPrice,
                {dash:[15,15], color:'#88f'},
            );
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
            var text = this.instrument.replace('_',' ');
            text = text.toLowerCase();
            c.textBaseline = "alphabetic";
            c.fillText(text, 10, fontSize);
        }

        // indicators
        var indicators = this.pageIndicators.indicators;
        for(var indicator of indicators){
            if(!indicator.getShown()){ continue; }
            var name = indicator.getName();
            if(name === 'ma'){
                c.setLineDash([]);
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
        this.showPriceLine(currentPrice, {text:currentPrice});

        // current trade
        this.showCurrentTrade();

        this.showDrawings();
    }

    showDrawings(){
        const c = this.context;
        const drawings = this.drawings.filter(
            d => d.pair === this.instrument
        );
        for(let drawing of drawings){
            switch(drawing.type){
                case 'horiz':
                    this.showPriceLine(
                        drawing.price, {color:drawing.color}
                    );
                    break;
                case 'trend':
                    this.showTrendLine(drawing);
                    break;
            }
        }
    }

    getCandleByTime(time){
        let candle = this.chartData.candles.find(c=>c.time===time);
        return candle;
    }

    onBtnLongShort = event => {
        const btn = event.target;
        console.log('button html',btn.innerHTML);
        if(btn.innerHTML === 'long'){
            btn.innerHTML = 'short';
            btn.style.color = this.colors.darkRed;
        } else {
            btn.innerHTML = 'long';
            btn.style.color = this.colors.darkGreen;
        }
    };

    showTrendLine(drawing){
        if(this.timeframe !== drawing.timeframe){ return; }
        const fromCandle = this.getCandleByTime(drawing.startTime);
        const fromx = this.candleToScreen(fromCandle);
        const fromy = this.priceToScreen(drawing.startPrice);
        const toCandle = this.getCandleByTime(drawing.endTime);
        const tox = this.candleToScreen(toCandle);
        const toy = this.priceToScreen(drawing.endPrice);
        const c = this.context;
        c.strokeStyle = drawing.color;
        c.beginPath();
        c.moveTo(fromx, fromy);
        c.lineTo(tox, toy);
        c.stroke();
    }

    showCurrentTrade(){
        const c = this.context;
        if(!this.chartData.trade.id){ return; }
        const trade = this.chartData.trade;
        const profit = parseFloat(trade.unrealizedPL);
        const entryPrice = trade.price;
        const entryColor = profit > 0
            ? this.colors.darkGreen
            : this.colors.darkRed;
        this.showPriceLine(
            entryPrice,
            {text: profit.toFixed(2), color: entryColor},
        );
        if(trade.stopLossOrder){
            this.showPriceLine(
                trade.stopLossOrder.price,
                {text: 'stop', color: red, dash: [20,20]},
            );

        }
    }

    showPriceLine(price,options){
        const c = this.context;
        const dash = options.dash || [];
        const color = options.color || '#888';
        const text = options.text || null;
        const fontSize = options.fontSize || 30;
        const y = this.priceToScreen(price);
        c.setLineDash(dash);
        c.strokeStyle = color;
        c.beginPath();
        c.moveTo(0,y);
        c.lineTo(this.root.width,y);
        c.stroke();

        if(!text){return;}
        c.font = `700 ${fontSize}px Verdana`;
        const width = c.measureText(text).width;
        c.fillStyle = color;
        c.fillRect(
            this.root.width-width, y-fontSize/2,
            width, fontSize
        );

        c.fillStyle = 'white';
        c.textBaseline = "hanging";
        c.fillText(text, this.root.width-width, y-fontSize/2);
    }

    startDrawMode(drawingTool){
        this.drawingTool = drawingTool;
        this.drawingMode = true;
    }

    toggleTradeForm(){
        let form = $('#trade-form');
        if(this.tradeFormOpen){
            this.tradeFormOpen = false;
            form.hide();
        } else {
            this.tradeFormOpen = true;
            form.show();
        }
    }

}
