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
        this.clearNewTrade();
        this.instrumentListInitialized = false;
        this.init();
    }

    addDrawing(){
        this.drawings.push(this.currentDrawing);
        this.currentDrawing = null;
        this.writeDrawings();
        this.show();
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
    
    candleToScreen(candle){
        let index = this.chartData.candles.indexOf(candle);
        return this.getX(index);
    }

    clearNewTrade(){
        this.newTrade = {
            direction: 'long',
            units: 0,
            risk: 0,
            pickingStop: false,
            tempStop: 0,
            pickingProfit: false,
            tempProfit: 0,
        };
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

    cookieToDrawings(cookie){
        if(!cookie){ return null; }
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

    getCandleByTime(time){
        let candle = this.chartData.candles.find(c=>c.time===time);
        return candle;
    }

    getCurrentPrice(){
        const candles = this.chartData.candles;
        const lastCandle = candles[candles.length-1];
        return parseFloat(lastCandle.mid.c) || 0;
    }

    getNewStop(){
        return parseFloat($('#stop-input').val()) || 0;
    }

    getPriceAtScreenTop(){
        return this.focus.y;
    }

    getPricePerPixel(){
        return this.getScreenPriceRange() / this.getVisualScreenHeight();
    }

    getScreenPriceRange(){
        return this.vZoom;
    }

    getVisualScreenHeight(){
        return this.root.height / this.rezRatio;
    }

    getX(i) {
        var column = this.chartData.candles.length - i;
        var x = this.root.width - this.hZoom * column;
        x -= this.focus.x;
        return x
    }

    hideToast(){
        $('#toast').hide();
    }

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

    initTradeForm(){
        const tradeForm = document.createElement('div');
        tradeForm.setAttribute('id','trade-form');

        const longShort = this.makeElement('button',tradeForm,{
            text: 'long',
            style:{color:this.colors.darkGreen},
            attr: {id: 'btn-long-short'},
        });
        $(longShort).on('click',this.onBtnLongShort);

        const cur = this.makeElement('div',tradeForm,{
            attr:{class:'form-field'} });
        const curlab = this.makeElement('div',cur,{
            text:'current',attr:{class:'label'} });
        const curval = this.makeElement('div',cur,{
            attr:{id:'current-value'} });

        const unitsField = this.makeInputField(
            'units','units-input',tradeForm,this.onUnitsKeyUp
        );

        const riskField = this.makeInputField(
            'risk','risk-input',tradeForm
        );
        $(riskField).on('change',this.onRiskChange);

        let makePriceField = (name,parentElem,btnCallback) => {
            const f = this.makeElement('div',parentElem,{
                attr:{class:'form-field'} });
            this.makeElement('div',f,{attr:{class:'label'}, text:name });
            this.makeElement('input',f,{
                attr:{id:name+'-input', class:'short-input'} });
            const btn = this.makeElement('button',f,{ text:'chart' });
            btn.setAttribute('id','btn-picking-'+name);
            btn.setAttribute('class','ml5');
            $(btn).on('click',btnCallback);
            return f;
        };

        makePriceField('stop',tradeForm,this.onBtnStop);
        makePriceField('profit',tradeForm,this.onBtnProfit);

        this.makeElement('div',tradeForm,{
            attr: {id: 'reward-risk'},
        });

        let buttonDiv = this.makeElement('div', tradeForm, {
            style: {'margin-top':'5px'},
        });
        let cancelButton = this.makeElement('button', buttonDiv, {
            text: 'cancel',
        });
        $(cancelButton).on('click',this.onBtnCancel);
        let submitButton = this.makeElement('button', buttonDiv, {
            text: 'submit',
        });
        $(submitButton).on('click',this.onBtnSubmit);

        const chartWrapper = $('#chart-wrapper');
        chartWrapper.append(tradeForm);
        $(tradeForm).hide();
    }

    makeElement(tag,parentElem,options){
        const elem = document.createElement(tag);
        if(options.attr){
            for(let key of Object.keys(options.attr)){
                elem.setAttribute(key, options.attr[key]);
            }
        }
        if(options.style){
            for(let key of Object.keys(options.style)){
                elem.style[key] = options.style[key];
            }
        }
        if(options.text){
            elem.textContent = options.text;
        }
        parentElem.append(elem);
        return elem;
    }

    makeInputField(name,inputId,parentElem,onKeyUp){
        const field = this.makeElement('div',parentElem,{
            attr:{class: 'form-field'},
        });
        const label = this.makeElement('div',field,{
            text: name, attr: {class:'label'},
        });
        const input = this.makeElement('input',field,{
            attr: {type:'text',id:inputId,class:'short-input'},
            style: {display:'inline-block'},
        });
        if(onKeyUp){
            $(input).on('keyup',onKeyUp);
        }
        return field;
    }

    onBtnCancel = () => {
        this.clearNewTrade();
        this.toggleTradeForm();
    };

    onBtnSubmit = () => {
        const count = this.newTrade.units;
        if(!count){ return; }
        const current = this.getCurrentPrice();
        console.log('onBtnSubmit',this.newTrade);
        console.log('current', current);

        // TODO: create an actual trade

        this.clearNewTrade();
        this.toggleTradeForm();
    };

    onBtnLongShort = () => {
        // const btn = event.target;
        const btn = $('#btn-long-short')[0];
        console.log('button html',btn.innerHTML);
        if(btn.innerHTML === 'long'){
            btn.innerHTML = 'short';
            btn.style.color = this.colors.darkRed;
        } else {
            btn.innerHTML = 'long';
            btn.style.color = this.colors.darkGreen;
        }
        this.newTrade.direction = btn.innerHTML;
        this.updateRiskField();
    };

    onBtnProfit = event => {
        if(this.newTrade.pickingProfit){
            this.setPickingProfit(false);
        } else {
            this.setPickingProfit(true);
            this.setPickingStop(false);
        }
    };

    onBtnStop = event => {
        if(this.newTrade.pickingStop){
            this.setPickingStop(false);
        } else {
            this.setPickingStop(true);
            this.setPickingProfit(false);
        }
    };

    onRiskChange = event => {
        const risk = parseFloat(event.target.value) || 0;
        console.log('onRiskChange',risk);
        if(!risk){ return; }
        const stop = this.getNewStop();
        if(!stop){ return; }
        const current = this.getCurrentPrice();
        let difference = current - stop;
        if(this.newTrade.direction === 'short'){
            difference = -difference;
        }
        const count = risk / difference;
        const unitsInput = $('#units-input');
        unitsInput.val(parseInt(count));
        this.onUnitsKeyUp({target: unitsInput});
    };

    onUnitsKeyUp = event => {
        const count = parseInt(event.target.value) || 0;
        this.newTrade.units = count;
        this.updateRiskField();
    };

    updateRatioField(){
        const element = $('#reward-risk')
        element.html('');
        const profit = this.newTrade.tempProfit;
        if(!profit){ return; }
        const current = this.getCurrentPrice();
        const direction = this.newTrade.direction;
        if(
            (profit > current && direction === 'short')
            || (profit < current && direction === 'long')
        ){
            this.onBtnLongShort();
            return this.updateRatioField();
        }
        const stop = this.newTrade.tempStop;
        if(!stop){ return; }
        const toGain = Math.abs(profit - current);
        const toLose = Math.abs(current - stop);
        const ratio = (toGain / toLose).toFixed(2);
        element.html('reward : risk  =  '+ratio+' : 1');
    }

    updateRiskField(){
        const count = this.newTrade.units;
        if(!count){ return; }
        const stop = this.getNewStop();
        if(!stop){ return; }
        const current = this.getCurrentPrice();
        const direction = this.newTrade.direction;
        let risk = (current - stop) * count;
        if(direction === 'short'){ risk = -risk; }
        if(risk < 0){
            this.onBtnLongShort();
            return this.updateRiskField();
        }
        const riskInput = $('#risk-input');
        riskInput.val(risk.toFixed(5));
    }

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

    onMouseUp = event => {
        this.mouseDown = false;
        this.mouseDragged = false;
        const where = {x:event.offsetX, y:event.offsetY};
        if(this.drawingMode){
            this.createDrawing(where);
        }
        else if(this.newTrade.pickingProfit){
            this.setPickingProfit(false);
            const price = this.screenToPrice(where.y).toFixed(5);
            this.setNewProfit(price);
        }
        else if(this.newTrade.pickingStop){
            this.setPickingStop(false);
            const price = this.screenToPrice(where.y).toFixed(5);
            this.setNewStop(price);
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

    priceToScreen(price){
        var atTop = this.getPriceAtScreenTop();
        var range = this.getScreenPriceRange();
        var priceBelowHigh = atTop - price;
        var percentDown = priceBelowHigh / range;
        return this.root.height * percentDown;
    }

    readDrawings(){
        let cookie = this.storage.get(this.drawingsCookieName);
        this.drawings = this.cookieToDrawings(cookie);
    }

    resizeChart(w,h){
        if(w){this.styleWidth = w;}
        if(h){this.styleHeight = h;}
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

    setInstrument(name){
        this.instrument = name;
        this.updateChartData();
    }

    setNewProfit(price){
        if(this.newTrade.tempStop){
            if(!this.validateProfitAndStop(
                price, this.newTrade.tempStop
            )){ return; }
        }
        $('#profit-input').val(price);
        this.newTrade.tempProfit = parseFloat(price);
        this.updateRatioField();
        this.show();
    }

    setNewStop(price){
        if(this.newTrade.tempProfit){
            if(!this.validateProfitAndStop(
                this.newTrade.tempProfit, price
            )){ return; }
        }
        $('#stop-input').val(price);
        this.newTrade.tempStop = parseFloat(price);
        this.updateRiskField();
        this.updateRatioField();
        this.show();
    }

    setPickingProfit(picking){
        let btn = $('#btn-picking-profit');
        if(picking){
            btn.addClass('active');
            this.newTrade.pickingProfit = true;
        } else {
            btn.removeClass('active');
            this.newTrade.pickingProfit = false;
        }
    }

    setPickingStop(picking){
        let btn = $('#btn-picking-stop');
        if(picking){
            btn.addClass('active');
            this.newTrade.pickingStop = true;
        } else {
            btn.removeClass('active');
            this.newTrade.pickingStop = false;
        }
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
        $('#btn-toast-close').on('click',this.hideToast);
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
                // return a.getMonth() !== b.getMonth();
                return a.getYear() !== b.getYear();
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
                if(!indicator.values){
                    console.log('indicator has no values',indicator);
                }
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
        var currentPrice = this.getCurrentPrice();
        this.showPriceLine(currentPrice, {text:currentPrice});

        // current trade
        this.showCurrentTrade();

        this.showDrawings();

        this.showNewTrade();

    }

    showNewTrade(){
        if(this.newTrade.tempStop){
            this.showPriceLine(this.newTrade.tempStop, {
                color: this.colors.darkRed,
                dash: [5,20],
                start: this.root.width / 2,
            });
        }
        if(this.newTrade.tempProfit){
            this.showPriceLine(this.newTrade.tempProfit, {
                color: this.colors.darkGreen,
                dash: [5,20],
                start: this.root.width / 2,
            });
        }
    }

    showDrawings(){
        if(!this.drawings){ return; }
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

    showToast(message, is_error){
        const toast = $('#toast');
        const messageElement = $('#toast-message');
        messageElement.html(message);
        if(is_error){
            toast.css("background","#c55");
            toast.css("color","white");
        } else {
            toast.css("background","white");
            toast.css("color","gray");
        }
        toast.show();
    }

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
                {text: 'stop', color: this.colors.darkRed, dash: [20,20]},
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
        const start = options.start || 0;
        c.setLineDash(dash);
        c.strokeStyle = color;
        c.beginPath();
        c.moveTo(start,y);
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
            let currentPrice = this.getCurrentPrice();
            $('#current-value').html(currentPrice);
            form.show();
        }
    }

    updateChartData(){
        this.chartSource.getChartData(
            this.instrument, this.timeframe, this.initChartData
        );
    }

    validateProfitAndStop(profit, stop){
        const current = this.getCurrentPrice();
        let same = false;
        if(profit > current && stop > current){
            same = true;
        }
        if(profit < current && stop < current){
            same = true;
        }
        if(same){
            this.showToast("Stop-loss and profit-goal can't be on the same side of the current price", true);
            return false;
        }
        return true;
    }

    writeDrawings(){
        const cookie = this.drawingsToCookie();
        this.storage.set(this.drawingsCookieName, cookie);
    }
}
