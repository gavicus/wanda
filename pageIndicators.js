class PageIndicators extends Page {
    constructor(callback){
        super('page-indicators');
        this.callback = callback;
        this.storage = new Storage();
        this.indicators = [];
        this.cookieName = 'o-indicators';
        this.readStored();
        this.initForm();
    }

    initForm(){
        this.clearElement(this.root);
        var container = document.createElement('div');
        container.setAttribute('id','ind-list');
        this.root.append(container);
    }

    readStored(){
        var stored = this.storage.get(this.cookieName);
        if(!stored){ return; }
        var entries = stored.split('|');
        this.indicators = entries.map(e => e.split(','));
    }

    writeToStored(){
        var indString = this.indicators
            .map(i => i.join(','))
            .join('|');
        this.storage.set(this.cookieName,indString);
    }
}

