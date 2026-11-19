export function completionSummary(data,state,assessment=window.PA_CATALOG.assessment){
 const seen=new Set();let assessments=0,closed=0,sections=0,sectionTotal=0,quizzes=0,quizTotal=0,remainingSections=0,remainingQuizzes=0;
 for(const subject of data.subjects||[])for(const event of subject.events||[]){const key=subject.id+'/'+event.id;if(seen.has(key))continue;seen.add(key);assessments++;const done=state.topicChecks?.['assessment:'+key]===true;if(done)closed++;const s=assessment(subject.id,event.id,state);if(!s)continue;sections+=s.read;sectionTotal+=s.total;quizzes+=s.quizzes;quizTotal+=s.quizTotal;if(!done){remainingSections+=Math.max(0,s.total-s.read);remainingQuizzes+=Math.max(0,s.quizTotal-s.quizzes);}}
 return {assessments,closed,allClosed:assessments>0&&closed===assessments,sections,sectionTotal,quizzes,quizTotal,remainingSections,remainingQuizzes};
}
export function completionLabels(s,owner=''){
 const who=owner?' do '+owner:'';
 if(!s)return [['—','A carregar matérias'+who+'…'],['—','A carregar quizzes'+who+'…']];
 if(!s.assessments)return [['Sem matérias','Ainda sem avaliações publicadas'],['0/0','Ainda sem quizzes publicados']];
 return [[s.allClosed?'Matérias'+who+' concluídas':s.sections+'/'+s.sectionTotal,s.allClosed?'Sem secções pendentes':'Secções revistas'+who+' · '+(s.remainingSections?'Faltam rever '+s.remainingSections+' nas matérias por concluir':'Sem secções pendentes nas matérias por concluir')],[s.quizzes+'/'+s.quizTotal,'Quizzes realizados'+who+' · '+(s.remainingQuizzes?'Faltam realizar '+s.remainingQuizzes+' nas matérias por concluir':'Sem quizzes pendentes nas matérias por concluir')]];
}
export function renderCompletionStats(cards,summary,owner=''){
 const labels=completionLabels(summary,owner);cards.forEach((card,i)=>{if(!card)return;card.setAttribute('aria-busy',String(!summary));for(const [selector,value] of [['strong',labels[i][0]],['small',labels[i][1]]]){const n=card.querySelector(selector);if(n&&n.textContent!==value)n.textContent=value;}});
}
