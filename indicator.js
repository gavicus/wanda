class Indicator {
    constructor(dataString){
        this.fields = {};
        this.fromString(dataString);
    }

    fromString(s){
        let pairs = s.split(',');
        for(let pair of pairs){
            let [key,value] = pair.split(':');
            if(value === 'false'){ value = false; }
            this.fields[key] = value;
        }
    }

    get(fieldName){
        return this.fields[fieldName];
    }

    getDisplay(){
        var display = this.getName();
        if(this.getName() === 'ma'){
            display += ' ' + this.fields['periods'];
        }
        return display;
    }

    getName(){ return this.fields.name; }

    getShown(){
        if('shown' in this.fields){
            return this.fields.shown;
        }
        return true;
    }

    toString(){
        var fieldArray = [];
        for(var key of Object.keys(this.fields)){
            fieldArray.push(key+':'+this.fields[key]);
        }
        return fieldArray.join(',');
    }
}

