class Control {
    constructor(){
        this.root = document.getElementById('root');
        this.oanda = new Oanda();
        this.pageIndicators = new PageIndicators(this.indicatorsCallback);
        this.pageChart = new PageChart(this.oanda, this.pageIndicators);
        this.pageTrades = new PageTrades(this.tradesCallback);
        this.pagePairs = new PagePairs(this.oanda, this.pairsCallback);
        this.pageDraw = new PageDraw(this.drawCallback);
        this.pageToken = new PageToken(this.oanda, this.tokenCallback);
        this.setupEvents();
        this.pageChart.init();
        this.showPage();
        this.setToolData();
    }

    clearRoot(){
        while(this.root.firstChild){
            this.root.removeChild(this.root.firstChild);
        }
    }

    onBtnAccount = event => {
        this.getAccountData();
        this.showPage('root');
    };

    onBtnChart = event => {
        if(event !== true){
            this.pageChart.autoCenterChart();
        }
        this.pageChart.show();
        this.showPage('chart-wrapper');
    };

    onBtnDraw = event => {
        this.showPage('page-draw');
    };

    onBtnDrawTool = event => {
        console.log('onBtnDrawTool',this.onBtnDrawTool);
        this.pageChart.startDrawMode(this.drawingTool);
    };

    onBtnIndicators = event => {
        this.showPage('page-indicators');
    };

    onBtnPairs = event => {
        this.showPage('page-pairs');
    };

    onBtnToken = event => {
        this.showPage('page-token');
    };

    showPage(pageId){
        $('.tab').hide();
        $('#' + pageId).show();
        let btn = $('#btn-draw-tool');
        btn.hide();
        if(pageId === 'chart-wrapper'){
            btn.show();
            this.setToolData();
        }
    }

    onBtnTrade = () => {
        this.pageChart.toggleTradeForm();
    };

    onBtnTrades = event => {
        this.oanda.getAccountInfo(this.pageTrades.show);
        this.showPage('root');
    };

    getAccountData(){
        this.oanda.getAccountInfo(this.showAccountData);
    }

    setToolData(){
        this.drawingTool = this.pageDraw.getToolData();
        let toolName = this.drawingTool.tool;
        $('#btn-draw-tool').html(toolName);
    }

    drawCallback = (message, data) => {
        console.log('drawCallback',message,data);
        if(message === 'select'){
            this.drawingTool = data;
            this.onBtnChart(true);
        }
    };

    indicatorsCallback = (message) => {
        console.log('indicatorsCallback',message);
        if(message === 'update'){
            this.pageChart.computeIndicators();
            this.pageChart.show();
        }
    };

    pairsCallback = (message) => {
        if(message === 'changed'){
            this.pageChart.initInstrumentList();
        }
    };

    tokenCallback = (message) => {
        if(message === 'set'){
            this.showPage('none');
        }
    };

    tradesCallback = (message,data) => {
        if(message === 'show-chart'){
            console.log('tradesCallback',data);
            this.pageChart.setInstrument(data);
            this.onBtnChart();
        }
    };

    setToken(t){
        this.oanda.setToken(t);
    }

    setupEvents(){
        document.getElementById('btn-account').addEventListener(
            'click', this.onBtnAccount
        );
        document.getElementById('btn-token').addEventListener(
            'click', this.onBtnToken
        );
        document.getElementById('btn-chart').addEventListener(
            'click', this.onBtnChart
        );
        document.getElementById('btn-trades').addEventListener(
            'click', this.onBtnTrades
        );
        document.getElementById('btn-trade').addEventListener(
            'click', this.onBtnTrade
        );
        document.getElementById('btn-pairs').addEventListener(
            'click', this.onBtnPairs
        );
        document.getElementById('btn-indicators').addEventListener(
            'click', this.onBtnIndicators
        );
        document.getElementById('btn-draw').addEventListener(
            'click', this.onBtnDraw
        );
        document.getElementById('btn-draw-tool').addEventListener(
            'click', this.onBtnDrawTool
        );
    }

    showAccountData = data => {
        this.clearRoot();
        const ul = document.createElement('ul');
        const account = data.account;
        var keys = Object.keys(account);
        var wanted = [
            'id','balance','openTradeCount','openPositionCount',
            'trades','marginUsed','marginAvailable',
            'withdrawlLimit',
        ];
        for(var key of wanted){
            var li = document.createElement('li');
            li.textContent = key + ': ' + account[key];
            ul.appendChild(li);
        };
        this.root.appendChild(ul);
    }

    showTradesData = data => {
    }
}

const c = new Control();

