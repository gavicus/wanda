class PageDraw extends Page {
    constructor(callback){
        super('page-draw');
        this.callback = callback;
        this.storage = new Storage();
        this.cookieName = 'o-drawing-tools';
        this.tools = [
            {name:'trend', fields:{color:'color',thickness:'input'}},
            {name:'horiz', fields:{color:'color',thickness:'input'}},
        ];
        this.selected = this.tools[0].name;
        this.init();
    }

    createToolForm(tool){
        const tab = document.createElement('div');
        const tabId = 'tool-'+tool.name;
        tab.setAttribute('id',tabId);
        tab.setAttribute('class','tool-tab');

        const title = document.createElement('div');
        title.textContent = tool.name + ' tool';
        title.setAttribute('class','form-field');
        tab.append(title);

        for(let name of Object.keys(tool.fields)){
            const type = tool.fields[name];
            let wrapper = document.createElement('div');
            wrapper.setAttribute('class','form-field');
            let inputId = tabId+'-'+name;
            if(type === 'input' || type === 'color'){
                let label = document.createElement('label');
                label.textContent = name;
                let input = document.createElement('input');
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

    init(){
        this.clearElement(this.root);
        let container = document.createElement('div');
        container.setAttribute('class','form-field');
        let toolMenu = document.createElement('select');
        toolMenu.setAttribute('id','tool-menu');
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
        let submit = document.createElement('button');
        submit.setAttribute('class','form-field');
        submit.textContent = 'select';
        $(submit).on('click',this.onBtnSelect);
        this.root.append(submit);
        this.readSettings();
    }

    getSelectedTool(){
        return this.selected;
    }

    getSelectedColor(){
        let tabId = 'tool-' + this.selected;
        let inputId = tabId+'-'+'color';
        let input = $('#'+inputId);
        return input.val();
    }

    getSelectedThickness(){
        let tabId = 'tool-' + this.selected;
        let inputId = tabId+'-'+'thickness';
        let input = $('#'+inputId);
        return input.val();
    }

    getToolData(){
        return {
            tool: this.getSelectedTool(),
            color: this.getSelectedColor(),
            thickness: this.getSelectedThickness(),
        };
    }

    setSelectedTool(toolName){
        const toolMenu = $('#tool-menu');
        toolMenu.val(toolName);
        toolMenu.change();
    }

    onBtnSelect = () => {
        this.writeSettings();
        this.readSettings(); // temporary test
        this.callback('select', this.getToolData());
    };

    onColorChange = inputId => {
        let input = $('#' + inputId)[0];
        let value = input.value;
        if(value.length < 3){ value = '#fff'; }
        if(value[0] !== '#'){ value = '#' + value; }
        let parent = $(input).parent()[0];
        let box = parent.children[1];
        box.style.background = value;
    }

    onToolChange = event => {
        let tool = event.target.value;
        this.selected = tool;
        $('.tool-tab').hide();
        $('#tool-'+tool).show();
    };

    readSettings(){
        const stored = this.storage.get(this.cookieName);
        if(!stored){ return; }
        for(let entry of stored.split('|')){
            let entryHash = {}
            for(let field of entry.split(',')){
                let [key,value] = field.split(':');
                entryHash[key] = value;
            }
            if(entryHash.lastTool){
                this.setSelectedTool(entryHash.lastTool);
            } else if(entryHash.tool) {
                let tabId = 'tool-' + entryHash.tool;
                let inputId = tabId+'-'+'color';
                let input = $('#'+inputId);
                input.val(entryHash.color);
                input.keyup();
                inputId = tabId+'-'+'thickness';
                $('#'+inputId).val(entryHash.thickness);

            }
        }
    }

    writeSettings(){
        const settingsArray = ['lastTool:'+this.selected];
        for(let tool of this.tools){
            let entry = ['tool:'+tool.name];
            let tabId = 'tool-' + tool.name;
            for(let field of Object.keys(tool.fields)){
                let fieldId = tabId + '-' + field;
                let fieldValue = $('#'+fieldId)[0].value;
                entry.push(`${field}:${fieldValue}`);
            }
            settingsArray.push(entry.join(','));
        }
        const storageString = settingsArray.join('|');
        this.storage.set(this.cookieName, storageString);
    }
}

