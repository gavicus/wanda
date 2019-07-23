class Control {
    constructor(){
        this.root = document.getElementById('root');
        this.oanda = new Oanda();
        this.pageIndicators = new PageIndicators(this.indicatorsCallback);
        this.pageChart = new PageChart(this.oanda, this.pageIndicators);
        this.pageTrades = new PageTrades(this.tradesCallback);
        this.pagePairs = new PagePairs(this.oanda, this.pairsCallback);
        this.setupEvents();
        this.pageChart.init();
        $('.tab').hide();
    }

    clearRoot(){
        while(this.root.firstChild){
            this.root.removeChild(this.root.firstChild);
        }
    }

    onBtnAccount = event => {
        this.getAccountData();
        $('.tab').hide();
        $('#root').show();
    };

    onBtnChart = event => {
        this.pageChart.autoCenterChart();
        this.pageChart.show();
        $('.tab').hide();
        $('#chart-wrapper').show();
    };

    onBtnIndicators = event => {
        $('.tab').hide();
        $('#page-indicators').show();
    };

    onBtnPairs = event => {
        $('.tab').hide();
        $('#page-pairs').show();
    };

    onBtnSet = event => {
        const input = document.getElementById('token-input');
        this.setToken(input.value);
        input.value = '';
        const field = document.getElementById('token-field');
        field.innerHTML = 'set';
    }

    onBtnTrades = event => {
        this.oanda.getAccountInfo(this.pageTrades.show);
        $('.tab').hide();
        $('#root').show();
    }

    getAccountData(){
        this.oanda.getAccountInfo(this.showAccountData);
    }

    indicatorsCallback = (message) => {
        console.log('indicatorsCallback',message);
    };

    pairsCallback = (message) => {
        if(message === 'changed'){
            this.pageChart.initInstrumentList();
        }
    };

    tradesCallback = (message,data) => {
        console.log('tradesCallback', message,data);
        this.pageChart.setInstrument(data);
        this.onBtnChart();
    };

    setToken(t){
        this.oanda.setToken(t);
    }

    setupEvents(){
        document.getElementById('btn-set').addEventListener(
            'click', this.onBtnSet
        );
        document.getElementById('btn-account').addEventListener(
            'click', this.onBtnAccount
        );
        document.getElementById('btn-chart').addEventListener(
            'click', this.onBtnChart
        );
        document.getElementById('btn-trades').addEventListener(
            'click', this.onBtnTrades
        );
        document.getElementById('btn-pairs').addEventListener(
            'click', this.onBtnPairs
        );
        document.getElementById('btn-indicators').addEventListener(
            'click', this.onBtnIndicators
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

