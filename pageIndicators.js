class PageIndicators extends Page {
    constructor(callback){
        super('page-indicators');
        this.callback = callback;
        this.storage = new Storage();
        this.indicators = [];
        this.cookieName = 'o-indicators';
        this.readStored();
        this.selectedIndex = -1;
        this.editForms = [
            {name:'indicator',fields:{}},
            {name:'ma',fields:{periods:'input',color:'color'}},
        ];
        this.initView();
        this.readStored();
        this.populateList();
    }

    boldSelected(){
        var items = $('.item');
        items.css('font-weight','normal');
        if(this.selectedIndex === -1){return;}
        $('#item-'+this.selectedIndex).css('font-weight','bold');
    }

    getEditForm(type){
        return this.editForms.find(f => f.name === type);
    }

    getFormString(){
        var typeMenu = $('#type-menu')[0];
        var name = typeMenu.value;
        var formArray = [`name:${name}`];
        var inputs = $('.indicator-input');
        for(var input of inputs){
            if(!input.value){ return false; }
            formArray.push(input.name + ':' + input.value);
        }
        return formArray.join(',');
    }

    getTypeMenu(){
        var menu = document.createElement('select');
        menu.setAttribute('id','type-menu');
        $(menu).on('change',this.onTypeMenuChange);
        for(var type of this.editForms){
            var option = document.createElement('option');
            option.setAttribute('value',type.name);
            option.textContent = type.name;
            menu.append(option);
        }
        return menu;
    }

    initView(){
        this.clearElement(this.root);
        var container = document.createElement('div');
        container.setAttribute('id','ind-list');
        container.setAttribute('class','column');
        this.root.append(container);

        container = document.createElement('div');
        container.setAttribute('id','ind-edit');
        container.setAttribute('class','column');
        var newButton = document.createElement('button');
        newButton.textContent = 'new';
        $(newButton).on('click',this.onNewButton);
        container.append(newButton);
        container.append(this.getTypeMenu());
        var formContainer = document.createElement('div');
        formContainer.setAttribute('id','form-container');
        container.append(formContainer);
        this.root.append(container);
    }

    initForm(type){
        var container = $('#form-container');
        this.clearElement(container);
        var form = this.getEditForm(type);

        var field = document.createElement('div');
        var shown = document.createElement('input');
        shown.setAttribute('type','checkbox');
        shown.setAttribute('id','shown');
        $(shown).on('change',this.onClickShown);
        field.append(shown);
        var shownLabel = document.createElement('span');
        shownLabel.textContent = 'shown';
        field.append(shownLabel);
        container.append(field);

        for(var fieldName of Object.keys(form.fields)){
            if(fieldName==='shown'){ continue; }
            var fieldType = form.fields[fieldName];
            var field = document.createElement('div');
            field.setAttribute('class','form-field');
            var label = document.createElement('label');
            label.textContent = fieldName;
            var input = document.createElement('input');
            input.setAttribute('name',fieldName);
            input.setAttribute('class','indicator-input');
            input.setAttribute('placeholder',fieldName);
            label.append(input);
            if(fieldType === 'color'){
                var colorBox = document.createElement('div');
                var id = fieldName+'-color';
                colorBox.setAttribute('id',id);
                colorBox.setAttribute('class','color-box');
                $(input).on('keyup',event=>this.onColorChange(event,id));
                $(input).on('change',event=>this.onColorChange(event,id));
                label.append(colorBox);
            }
            field.append(label);
            container.append(field);
        }
        if(Object.keys(form.fields).length > 0){
            var submitButton = document.createElement('button');
            submitButton.textContent = 'submit';
            $(submitButton).on('click',this.onSubmitButton);
            $(submitButton).css('margin-top','5px');
            container.append(submitButton);
        }
    }

    onClickItem = event => {
        var index = parseInt(event.target.id.split('-')[1]);
        this.selectedIndex = index;
        this.boldSelected();
        var indicator = this.indicators[index];
        this.populateForm(indicator);
    };

    onClickShown = event => {
        var indicator = this.indicators[this.selectedIndex];
        if(!indicator){ return; }
        indicator.fields['shown'] = event.target.checked;
        this.writeToStored();
    };

    onColorChange = (event, colorBoxId) => {
        var code = event.target.value;
        if(code.length < 3){ code = '#fff'; }
        if(code[0] !== '#'){ code = '#' + code; }
        $('#'+colorBoxId).css('background-color', code);
    };

    onNewButton = event => {
        this.selectedIndex = -1;
        this.boldSelected();
        $('#form-container input').val('');
        $('#form-container input').change();
    };

    onSubmitButton = event => {
        var formString = this.getFormString();
        if(formString){
            if(this.selectedIndex === -1){
                var indicator = new Indicator(formString);
                this.indicators.push(indicator);
                this.selectedIndex = this.indicators.length - 1;
            } else {
                var indicator = this.indicators[this.selectedIndex];
                indicator.fromString(formString);
            }
            this.populateList();
            this.writeToStored();
            this.callback('update');
        } else {
        }
    };

    onTypeMenuChange = event => {
        var type = event.target.value;
        this.initForm(type);
    };

    populateForm(item){
        var tm = $('#type-menu');
        tm.val(item.getName());
        tm.change();
        this.initForm(item.getName());
        for(var key of Object.keys(item.fields)){
            if(key==='name'){continue;}
            var elem = $(`[name="${key}"]`);
            elem.val(item.fields[key]);
            elem.change();
        }
        $('#shown').prop('checked',item.getShown());
    }

    populateList(){
        var container = $('#ind-list');
        this.clearElement(container);
        var ul = document.createElement('ul');
        for(var index in this.indicators){
            var item = this.indicators[index];
            var li = document.createElement('li');
            li.textContent = item.getDisplay();
            li.setAttribute('id','item-'+index);
            li.setAttribute('class','item');
            $(li).on('click',this.onClickItem);
            ul.append(li);
        }
        container.append(ul);
        this.boldSelected();
    }

    readStored(){
        var stored = this.storage.get(this.cookieName);
        if(!stored){ return; }
        var entries = stored.split('|');
        this.indicators = entries.map(e => new Indicator(e));
        console.log('readStored',this.indicators);
    }

    writeToStored(){
        var indString = this.indicators
            .map(i => i.toString())
            .join('|');
        this.storage.set(this.cookieName,indString);
        console.log('writeToStored',this.indicators);
    }
}

