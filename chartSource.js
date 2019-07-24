class ChartSource {
    constructor(source){
        this.source = source;
        this.pair = null;
        this.span = null; // H1 D W etc.
        this.candles = null;
        this.accountData = null;
        this.tradeData = null;
        this.chartData = null;
        this.instruments = null;
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
            && this.candles
        ){
            callback(this.candles);
        }
        this.pair = pair;
        this.span = span;
        this.source.getChartInfo(
            this.pair, this.span,
            data => {
                this.candles = data.candles;
                callback(data.candles);
            }
        );
    }

    getInstruments(callback){
        if(this.instruments){
            return callback(this.instruments);
        }
        this.source.getInstrumentList(
            data => {
                this.instruments = data.instruments;
                callback(this.instruments);
            }
        );
    }

    getChartData(pair, span, callback){
        this.chartData = {
            candles:null, account:null,
            trade:null, instruments:null,
        };
        this.getCandles(
            pair, span,
            data => {
                this.chartData.candles = data;
                this.returnChartData(callback);
            }
        );
        this.getTradeData(
            pair,
            data => {
                this.chartData.account = this.accountData;
                this.chartData.trade = this.tradeData || "no open trade";
                this.returnChartData(callback);
            }
        );
        this.getInstruments(
            data => {
                this.chartData.instruments = this.instruments;
                this.returnChartData(callback);
            }
        );
    }

    returnChartData(callback){
        if(
            this.chartData.candles
            && this.chartData.account
            && this.chartData.trade
            && this.chartData.instruments
        ){
            callback(this.chartData);
        }
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
            } else {
                callback("no open trade");
            }
        });
    }
}

