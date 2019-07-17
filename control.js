class Control {
    constructor(){
        this.root = document.getElementById('root');
        this.oanda = new Oanda();
        this.pageChart = new PageChart(this.oanda);
        this.pageTrades = new PageTrades('root');
        this.pagePairs = new PagePairs(this.oanda, this.pairsCallback);
        this.setupEvents();
        this.pageChart.init();
    }

    clearRoot(){
        while(this.root.firstChild){
            this.root.removeChild(this.root.firstChild);
        }
    }

    onBtnAccount = event => {
        this.getAccountData();
    };

    onBtnChart = event => {
        this.pageChart.init();
    };

    onBtnPairs = event => {
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
    }

    getAccountData(){
        this.oanda.getAccountInfo(this.showAccountData);
    }

    pairsCallback = (message) => {
        if(message === 'changed'){
            this.pageChart.initInstrumentList();
        }
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
        for(var key of keys){ console.log('key',key) }
        //console.log('positions',account.positions);
        console.log('trades',account.trades);
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

