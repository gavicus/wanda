class PageDraw extends Page {
    constructor(callback){
        super('page-draw');
        this.callback = callback;
        this.tools = [
            {name:'trend', fields:{color:'color',thickness:'input'}},
            {name:'horiz', fields:{color:'color',thickness:'input'}},
            {name:'foo', fields:{color:'color',thickness:'input'}},
        ];
        this.selected = this.tools[0].name;
        this.init();
    }

    init(){
        this.clearElement(this.root);
        let container = document.createElement('div');
        let toolMenu = document.createElement('select');
        $(toolMenu).on('change',this.onToolChange);
        container.append(toolMenu);
        for(let tool of this.tools){
            let option = document.createElement('option');
            option.textContent = tool.name;
            option.setAttribute('value', tool.name);
            toolMenu.append(option);
            container.append(this.createToolForm(tool));
        }
        this.root.append(container);
    }

    createToolForm(tool){
        let tab = document.createElement('div');
        let tabId = 'tool-'+tool.name;
        tab.setAttribute('id',tabId);
        tab.setAttribute('class','tool-tab');
        tab.textContent = tool.name;
        for(let name of Object.keys(tool.fields)){
            const type = tool.fields[name];
            let wrapper = document.createElement('div');
            if(type === 'input' || type === 'color'){
                let label = document.createElement('label');
                label.textContent = name;
                let input = document.createElement('input');
                let inputId = tabId+'-'+name;
                input.setAttribute('id',inputId);
                label.append(input);
                if(type === 'color'){
                    $(input).on(
                        'keyup',
                        ()=>this.onColorChange(inputId)
                    );
                    let box = document.createElement('div');
                    box.setAttribute('class','color-box');
                    label.append(box);
                }
                wrapper.append(label);
            }
            tab.append(wrapper);
        }
        if(tool.name !== this.selected){
            tab.style.display = 'none';
        }
        return tab;
    }

    onColorChange = inputId => {
        console.log('onColorChange',inputId);
        let input = $('#' + inputId)[0];
        console.log('input',input);
        let value = input.value;
        console.log(value);
        if(value.length < 3){ value = '#fff'; }
        if(value[0] !== '#'){ value = '#' + value; }
        let parent = $(input).parent()[0];
        console.log(parent);
        let box = parent.children[1];
        console.log(box);
        box.style.background = value;
    }

    onToolChange = event => {
        let tool = event.target.value;
        this.selected = tool;
        $('.tool-tab').hide();
        $('#tool-'+tool).show();
    };
}

