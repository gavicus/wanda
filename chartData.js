class ChartData {
    constructor(source){
        this.source = source;
        this.pair = null;
        this.span = null; // H1 D W etc.
        this.chartData = null;
        this.accountData = null;
        this.tradeData = null;
    }

    getAccount(callback){
        if(this.accountData){
            callback(this.accountData);
        }
        this.source.getAccountInfo(
            info => {
                this.accountData = info.account;
                callback(info.account);
            }
        );
    }

    getCandles(pair, span, callback){
        if(
            pair === this.pair
            && span === this.span
            && this.chartData
        ){
            callback(this.chartData);
        }
        this.pair = pair;
        this.span = span;
        this.source.getChartInfo(
            this.pair, this.span,
            data => {
                this.chartData = data.candles;
                callback(data.candles);
            }
        );
    }

    getChartData(pair, span, callback){
    }

    getTrades(callback){
        this.getAccount(account => callback(account.trades));
    }

    getTradeData(pair, callback){
        if(pair === this.pair && this.tradeData){
            callback(this.tradeData);
        }
        this.pair = pair;
        this.getTrades(tradeData => {
            if(!tradeData){ return callback(null); }
            const trade = tradeData
                ? tradeData.find(t => t.instrument === pair)
                : null;
            if(trade){
                this.source.getTradeInfo(
                    trade.id,
                    info => {
                        this.tradeData = info.trade;
                        callback(info.trade);
                    }
                );
            }
        });
    }
}

