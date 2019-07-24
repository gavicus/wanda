// https://developer.oanda.com/rest-live-v20/development-guide/

class Oanda {
    constructor(){
        this.practiceUrl = 'https://api-fxpractice.oanda.com/';
        this.liveUrl = 'https://api-fxtrade.oanda.com/';
        this.token = null;
        this.accountId = '001-001-1484225-001';
        this.storage = new Storage();
    }

    getData(path, callback){
        var token = this.getToken();
        if(!token){ return null; }
        var request = new XMLHttpRequest();
        var url = this.getUrl() + path;
        request.open('GET', url, true);
        request.setRequestHeader('Authorization','Bearer '+token);
        request.onload = () => {
            if(request.status >= 200 && request.status < 400){
                if(request.response){
                    var data = JSON.parse(request.response);
                    callback(data);
                } else { console.log('null response'); }
            } else {
                console.log('error:',request.status,request.statusText);
            }
        };
        request.send();
    }

    getAccountInfo(callback){
        var token = this.getToken();
        if(!token){ return null; }
        var request = new XMLHttpRequest();
        var url = this.getUrl() + 'v3/accounts/' + this.accountId;
        request.open('GET', url, true);
        request.setRequestHeader('Authorization','Bearer '+token);
        request.onload = () => {
            if(request.status >= 200 && request.status < 400){
                if(request.response){
                    var data = JSON.parse(request.response);
                    callback(data);
                } else { console.log('null response'); }
            } else {
                console.log('error:',request.status,request.statusText);
            }
        };
        request.send();
    }

    getTradeInfo(tradeId, callback){
        var token = this.getToken();
        if(!token){ return null; }
        var request = new XMLHttpRequest();
        var url = this.getUrl() + 'v3/accounts/' + this.accountId;
        url += '/trades/' + tradeId;
        request.open('GET', url, true);
        request.setRequestHeader('Authorization','Bearer '+token);
        request.onload = () => {
            if(request.status >= 200 && request.status < 400){
                if(request.response){
                    var data = JSON.parse(request.response);
                    callback(data);
                } else { console.log('null response'); }
            } else {
                console.log('error:',request.status,request.statusText);
            }
        }
        request.send();
    }

    getChartInfo(instrument, granularity, callback){
        var path = `v3/instruments/${instrument}/candles`;
        /*
            granularity options:
            https://developer.oanda.com/rest-live/rates/
        */
        path += '?granularity='+granularity;
        this.getData(path, callback);
    }

    getInstrumentList(callback){
        var path = `v3/accounts/${this.accountId}/instruments`;
        this.getData(path, callback);
    }

    getToken(){
        if(!this.token){
            this.token = this.storage.get('o-token');
        }
        return this.token;
    }

    getUrl(){ return this.liveUrl; }

    setToken(t){
        this.token = t;
        this.storage.set('o-token',t);
    }
}


