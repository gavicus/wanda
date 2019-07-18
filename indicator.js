class Indicator {
    constructor(dataString){
        this.fields = {};
        this.fromString(dataString);
    }

    fromString(s){
        var pairs = s.split(',');
        for(var pair of pairs){
            var [key,value] = pair.split(':');
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

    toString(){
        var fieldArray = [];
        for(var key of Object.keys(this.fields)){
            fieldArray.push(key+':'+this.fields[key]);
        }
        return fieldArray.join(',');
    }
}

