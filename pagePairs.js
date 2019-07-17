class PagePairs extends Page {
    constructor(source, callback){
        super('page-pairs');
        this.source = source;
        this.callback = callback;
        this.storage = new Storage();
        this.initForm();
        this.source.getInstrumentList(this.initInstrumentList);
    }

    initForm(){
        this.clearElement(this.root);
        var container = document.createElement('div');
        container.setAttribute('id','available-wrapper');
        var available = document.createElement('ul');
        available.setAttribute('id','available-list');
        container.append(available);
        this.root.append(container);
    }

    initInstrumentList = data => {
        this.instrumentData = data;
        var stored = this.storage.get('o-instruments');
        var elem = $('#available-list');
        var instruments = data.instruments;
        instruments.sort((a,b)=>a.name.localeCompare(b.name));
        for(var instrument of data.instruments){
            var item = document.createElement('li');
            var span = document.createElement('span');
            span.textContent = instrument.displayName;
            item.append(span);
            var checkbox = document.createElement('input');
            checkbox.setAttribute('type','checkbox');
            checkbox.setAttribute('value',instrument.name);
            checkbox.setAttribute('name','instrument');
            if(stored && stored.indexOf(instrument.name)>-1){
                $(checkbox).prop('checked',true);
            }
            $(checkbox).on('change',this.onCheckbox);
            item.append(checkbox);
            elem.append(item);
        }
    };

    onCheckbox = event => {
        var boxes = $('[name="instrument"]:checked');
        this.activeInstruments = boxes.toArray().map(b=>b.value);
        var toStore = this.activeInstruments.join(',');
        this.storage.set('o-instruments',toStore);
        this.callback('changed');
    };
}

