class PageToken extends Page {
    constructor(source, callback){
        super('page-token');
        this.callback = callback;
        this.source = source;
        this.storage = new Storage();
        this.init();
    }

    init(){
        this.clearElement(this.root);
        let container = document.createElement('div');
        container.setAttribute('class','form-field');
        container.setAttribute('id','token-field');
        let input = document.createElement('input');
        input.setAttribute('id','token-input');
        input.setAttribute('type','text');
        input.setAttribute('placeholder','token');
        container.append(input);
        let button = document.createElement('button');
        button.textContent = 'set';
        button.setAttribute('id','btn-set');
        $(button).on('click',this.onBtnSet);
        container.append(button);
        this.root.append(container);
    }

    onBtnSet = () => {
        const input = document.getElementById('token-input');
        this.source.setToken(input.value);
        input.value = '';
        this.callback('set');
    };
}

