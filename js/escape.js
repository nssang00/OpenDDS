let featureObj = {
  VVTStyle : {
    ABC: "23",    
    DEF: "&lt;&gt;45", 
    HGT: "&lt;=46",    
    BFC: "&lt;&gt;7,15,27,82",        
    EXS: "0,5,6,28",
    LMC: "&lt;2",
  },
  filter: [
    'all',
    //['>=', ['zoom'], 1],     
    //['<=', ['resolution'], 355],     
    //['>', ['resolution'], 153],      
    ['<=', ['get', 'HGB'], [45]],
    ['in', ['get', 'layer'], ['literal', ['water']]],
    //['==', ['get', 'class'], 'lake'],
    //['!', ['in', ['get', 'class'], ['literal', ['ocean']]]],//"&lt;&gt;15,6"
    //['in', ['get', 'class'], ['literal', ['lake']]],//"2,3,4"
    ['in', ['get', 'class'], [1, 2, 3]],
    ['!', ['in', ['get', 'BGC'], [7, 15, 27, 82]]],
  ]  
};

/*
    //['>=', ['zoom'], 1],     
    //['<=', ['resolution'], 355],     
    //['>', ['resolution'], 153],      
    //['==', ['get', 'layer'], 'water'],
    ['in', ['get', 'layer'], ['literal', ['water']]],
    //['==', ['get', 'class'], 'lake'],
    ['!', ['in', ['get', 'class'], ['literal', ['ocean']]]],//"&lt;&gt;15,6"
    //['in', ['get', 'class'], ['literal', ['lake']]],//"2,3,4"
    //['in', ['get', 'class'], [1, 2, 3]]
*/
let filters = [];
for(let prop in featureObj.VVTStyle)
{
  const [, operator, valuesPart] = featureObj.VVTStyle[prop]
                                              .replace(/&lt;/g, '<')
                                              .replace(/&gt;/g, '>')
                                              .replace(/<>/g, '!')
                                              .match(/([<>=!]+)?([\w+,]+)/);

  if(valuesPart.includes(','))
  {//['literal', ['lake']]
    //valuesPart.split(',').map(value => isNan(Number(value));

    const values =
    valuesPart.includes(',')
      ? valuesPart.split(',').map((value) =>
          isNaN(Number(value)) ? ['literal', value.split()] : [Number(value)]
        )
      : [isNaN(Number(valuesPart)) ? ['literal', [valuesPart]] : [Number(valuesPart)]];


    const filter = ['in', ['get', prop], valuesPart.split(',').map(Number)];
    filters.push(operator === '!' ? ['!', filter]: filter);
  }
  else
  {
    const finalOperator = !operator ? '==' : operator ==='!' ? '!=' : operator;
    filters.push([finalOperator, ['get', prop], valuesPart]);

  }



  console.log(prop +  ' ' + filters[0])
}
