class PageTrades extends Page {
    constructor(callback){
        super('root');
        this.callback = callback;
    }

    onClickEntry = event => {
        var children = event.target.parentElement.children;
        var instrument = children[1].innerHTML;
        this.callback('show-chart',instrument);
    };

    show = data => {
        const account = data.account;
        const trades = account.trades;
        this.clearRoot();
        const table = document.createElement('table');
        var fields = ['id','instrument','units','opened','price'];
        var thead = document.createElement('thead');
        var tr = document.createElement('tr');
        for(var field of fields){
            var td = document.createElement('td');
            td.textContent = field;
            tr.appendChild(td);
        }
        thead.appendChild(tr);
        table.appendChild(thead);
        for(var trade of trades){
            var tr = document.createElement('tr');
            tr.setAttribute('class','trade-entry');
            $(tr).on('click', this.onClickEntry);

            var tdid = document.createElement('td');
            tdid.textContent = trade.id;
            tr.appendChild(tdid);

            var tdinstrument = document.createElement('td');
            tdinstrument.textContent = trade.instrument;
            tr.appendChild(tdinstrument);

            var tdunits = document.createElement('td');
            var units = parseInt(trade.initialUnits);
            var unitsDisplay = Math.abs(units) + ' ';
            unitsDisplay += units > 0 ? 'long' : 'short';
            tdunits.textContent = unitsDisplay;
            tr.appendChild(tdunits);

            var tdopened = document.createElement('td');
            var d = new Date(trade.openTime);
            tdopened.textContent = d.toLocaleString();
            tr.appendChild(tdopened);

            var tdprice = document.createElement('td');
            tdprice.textContent = trade.price;
            tr.appendChild(tdprice);

            table.appendChild(tr);
        }
        this.root.appendChild(table);
    }
}
