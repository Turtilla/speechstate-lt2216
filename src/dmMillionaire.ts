import { MachineConfig, send, Action, assign } from "xstate";


function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}


const kbRequest = (text: string) =>
    fetch(new Request(`https://opentdb.com/api.php?amount=15&difficulty=easy&type=multiple`)).then(data => data.json())

const ans_grammar: { [index: string]: { confirmation?: string, negation?: string, help?: string } } = {

    "Yes.": { confirmation: "Yes" },
    "Yeah.": { confirmation: "Yes" },
    "Of course.": { confirmation: "Yes" },
    "Exactly.": { confirmation: "Yes" },
    "Yeah, exactly.": { confirmation: "Yes" },
    "No.": { negation: "No" },
    "Nope.": { negation: "No" },
    "No way.": { negation: "No" },
    "Not what I said.": { negation: "No" },
    "Help.": { help: "Help" },
    "Help me.": { help: "Help" },
    "I don't know what to do.": { help: "Help" },
    "I don't know what to say.": { help: "Help" }
}

export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    initial: 'idle',
    states: {
        idle: {
            on: {
                CLICK: 'init'
            }
        },
        init: {
            on: {
                TTS_READY: 'greet',
                CLICK: 'greet'
            }
        },

        greet: {
            entry: send((context) => ({
                type: 'SPEAK',
                value: `Welcome.`
            })),
            on: {
                entry: { actions: [assign({ partnerCounter: (context) => 0 }), assign({ dayCounter: (context) => 0 }), assign({ timeCounter: (context) => 0 })] },  // sets counters to 0
                ENDSPEECH: 'fetchQuestions'
            }
        },

        fetchQuestions: {
            invoke: {
                id: 'getInfo',
                src: (context, event) => kbRequest(context.celebrity), // can insert difficulty here with (context.difficulty) and ${text} in the function
                onDone: {
                    target: 'read',
                    actions: [
                        assign({ question1: (context, event) => event.data.results[0].question }),
                        assign({ corrAnswer1: (context, event) => event.data.results[0].correct_answer }),
                        assign({ incorrAnswerOne1: (context, event) => event.data.results[0].incorrect_answers[0] }),
                        assign({ incorrAnswerTwo1: (context, event) => event.data.results[0].incorrect_answers[1] }),
                        assign({ incorrAnswerThree1: (context, event) => event.data.results[0].incorrect_answers[2] }),

                        assign({ question2: (context, event) => event.data.results[1].question }),
                        assign({ corrAnswer2: (context, event) => event.data.results[1].correct_answer }),
                        assign({ incorrAnswerOne2: (context, event) => event.data.results[1].incorrect_answers[0] }),
                        assign({ incorrAnswerTwo2: (context, event) => event.data.results[1].incorrect_answers[1] }),
                        assign({ incorrAnswerThree2: (context, event) => event.data.results[1].incorrect_answers[2] }),

                        assign({ question3: (context, event) => event.data.results[2].question }),
                        assign({ corrAnswer3: (context, event) => event.data.results[2].correct_answer }),
                        assign({ incorrAnswerOne3: (context, event) => event.data.results[2].incorrect_answers[0] }),
                        assign({ incorrAnswerTwo3: (context, event) => event.data.results[2].incorrect_answers[1] }),
                        assign({ incorrAnswerThree3: (context, event) => event.data.results[2].incorrect_answers[2] }),

                        assign({ question4: (context, event) => event.data.results[3].question }),
                        assign({ corrAnswer4: (context, event) => event.data.results[3].correct_answer }),
                        assign({ incorrAnswerOne4: (context, event) => event.data.results[3].incorrect_answers[0] }),
                        assign({ incorrAnswerTwo4: (context, event) => event.data.results[3].incorrect_answers[1] }),
                        assign({ incorrAnswerThree4: (context, event) => event.data.results[3].incorrect_answers[2] }),

                        assign({ question5: (context, event) => event.data.results[4].question }),
                        assign({ corrAnswer5: (context, event) => event.data.results[4].correct_answer }),
                        assign({ incorrAnswerOne5: (context, event) => event.data.results[4].incorrect_answers[0] }),
                        assign({ incorrAnswerTwo5: (context, event) => event.data.results[4].incorrect_answers[1] }),
                        assign({ incorrAnswerThree5: (context, event) => event.data.results[4].incorrect_answers[2] }),

                        assign({ question6: (context, event) => event.data.results[5].question }),
                        assign({ corrAnswer6: (context, event) => event.data.results[5].correct_answer }),
                        assign({ incorrAnswerOne6: (context, event) => event.data.results[5].incorrect_answers[0] }),
                        assign({ incorrAnswerTwo6: (context, event) => event.data.results[5].incorrect_answers[1] }),
                        assign({ incorrAnswerThree6: (context, event) => event.data.results[5].incorrect_answers[2] }),

                        assign({ question7: (context, event) => event.data.results[6].question }),
                        assign({ corrAnswer7: (context, event) => event.data.results[6].correct_answer }),
                        assign({ incorrAnswerOne7: (context, event) => event.data.results[6].incorrect_answers[0] }),
                        assign({ incorrAnswerTwo7: (context, event) => event.data.results[6].incorrect_answers[1] }),
                        assign({ incorrAnswerThree7: (context, event) => event.data.results[6].incorrect_answers[2] }),

                        assign({ question8: (context, event) => event.data.results[7].question }),
                        assign({ corrAnswer8: (context, event) => event.data.results[7].correct_answer }),
                        assign({ incorrAnswerOne8: (context, event) => event.data.results[7].incorrect_answers[0] }),
                        assign({ incorrAnswerTwo8: (context, event) => event.data.results[7].incorrect_answers[1] }),
                        assign({ incorrAnswerThree8: (context, event) => event.data.results[7].incorrect_answers[2] }),

                        assign({ question9: (context, event) => event.data.results[8].question }),
                        assign({ corrAnswer9: (context, event) => event.data.results[8].correct_answer }),
                        assign({ incorrAnswerOne9: (context, event) => event.data.results[8].incorrect_answers[0] }),
                        assign({ incorrAnswerTwo9: (context, event) => event.data.results[8].incorrect_answers[1] }),
                        assign({ incorrAnswerThree9: (context, event) => event.data.results[8].incorrect_answers[2] }),

                        assign({ question10: (context, event) => event.data.results[9].question }),
                        assign({ corrAnswer10: (context, event) => event.data.results[9].correct_answer }),
                        assign({ incorrAnswerOne10: (context, event) => event.data.results[9].incorrect_answers[0] }),
                        assign({ incorrAnswerTwo10: (context, event) => event.data.results[9].incorrect_answers[1] }),
                        assign({ incorrAnswerThree10: (context, event) => event.data.results[9].incorrect_answers[2] }),

                        assign({ question11: (context, event) => event.data.results[10].question }),
                        assign({ corrAnswer11: (context, event) => event.data.results[10].correct_answer }),
                        assign({ incorrAnswerOne11: (context, event) => event.data.results[10].incorrect_answers[0] }),
                        assign({ incorrAnswerTwo11: (context, event) => event.data.results[10].incorrect_answers[1] }),
                        assign({ incorrAnswerThree11: (context, event) => event.data.results[10].incorrect_answers[2] }),

                        assign({ question12: (context, event) => event.data.results[11].question }),
                        assign({ corrAnswer12: (context, event) => event.data.results[11].correct_answer }),
                        assign({ incorrAnswerOne12: (context, event) => event.data.results[11].incorrect_answers[0] }),
                        assign({ incorrAnswerTwo12: (context, event) => event.data.results[11].incorrect_answers[1] }),
                        assign({ incorrAnswerThree12: (context, event) => event.data.results[11].incorrect_answers[2] }),

                        assign({ question13: (context, event) => event.data.results[12].question }),
                        assign({ corrAnswer13: (context, event) => event.data.results[12].correct_answer }),
                        assign({ incorrAnswerOne13: (context, event) => event.data.results[12].incorrect_answers[0] }),
                        assign({ incorrAnswerTwo13: (context, event) => event.data.results[12].incorrect_answers[1] }),
                        assign({ incorrAnswerThree13: (context, event) => event.data.results[12].incorrect_answers[2] }),

                        (context, event) => console.log(context, event),
                        (context, event) => console.log(event.data.results[0])
                    ]
                },
                onError: {
                    target: 'init'
                }
            }
        },

        read: {
            entry: send((context) => ({
                type: 'SPEAK',
                value: `Let me read out your next question. ${context.question1} The possible answers are: A. ${context.corrAnswer1}, B. ${context.incorrAnswerOne1}, C. ${context.incorrAnswerTwo1}, D. ${context.incorrAnswerThree1}. 
                        The next one. ${context.question2} The possible answers are: A. ${context.corrAnswer2}, B. ${context.incorrAnswerOne2}, C. ${context.incorrAnswerTwo2}, D. ${context.incorrAnswerThree2}.`
            })),
            on: { ENDSPEECH: 'init' }
        },


        question: {
            initial: 'choose',
            on: {
                RECOGNISED: [
                    {
                        target: '.formToFill',
                    },
                ],
                TIMEOUT: '.choose'
            },
            states: {
                choose: {
                    always: [
                        { target: 'prompt1', cond: (context) => context.partnerCounter !== 1 && context.dayCounter !== 1 && context.timeCounter !== 1 }, // need all info
                        { target: 'prompt2', cond: (context) => context.partnerCounter === 1 && context.dayCounter !== 1 && context.timeCounter !== 1 }, // have info about person
                        { target: 'prompt3', cond: (context) => context.partnerCounter !== 1 && context.dayCounter === 1 && context.timeCounter !== 1 }, // have info about day
                        { target: 'prompt4', cond: (context) => context.partnerCounter !== 1 && context.dayCounter !== 1 && context.timeCounter === 1 }, // have info about time
                        { target: 'prompt5', cond: (context) => context.partnerCounter === 1 && context.dayCounter === 1 && context.timeCounter !== 1 }, // have info about person and day
                        { target: 'prompt6', cond: (context) => context.partnerCounter !== 1 && context.dayCounter === 1 && context.timeCounter === 1 }, // have info about day and time
                        { target: 'prompt7', cond: (context) => context.partnerCounter === 1 && context.dayCounter !== 1 && context.timeCounter === 1 }, // have info about person and time
                        { target: '#root.dm.confirmTime', cond: (context) => context.partnerCounter === 1 && context.dayCounter === 1 && context.timeCounter === 1 }, // have all info 
                    ]
                },
                prompt1: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `What meeting do you want me to schedule?`
                    })),
                    on: { ENDSPEECH: 'ask' }
                },
                prompt2: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `When will that meeting take place?`
                    })),
                    on: { ENDSPEECH: 'ask' }
                },
                prompt3: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `Who and at what time will you be meeting?`
                    })),
                    on: { ENDSPEECH: 'ask' }
                },
                prompt4: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `Who and on what day will you be meeting?`
                    })),
                    on: { ENDSPEECH: 'ask' }
                },
                prompt5: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `At what time will this meeting take place?`
                    })),
                    on: { ENDSPEECH: 'ask' }
                },
                prompt6: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `Who will this meeting be with?`
                    })),
                    on: { ENDSPEECH: 'ask' }
                },
                prompt7: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `On what day will this meeting take place?`
                    })),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I didn't get it."),
                    on: { ENDSPEECH: 'choose' }
                },
                formToFill: {
                    type: 'parallel',
                    states: {
                        partner: {
                            initial: 'verify',
                            states: {
                                verify: {
                                    always: [
                                        // Analogously to the 'time' and 'day' states below, here we check if a given string is a part of the utterance and if so we assign the respective counter a value of 1, and the variable
                                        // the value that we associate with that string, and then move to 'final'. If there is no match we simply move to 'final'.
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Bob") !== -1, actions: [assign({ partnerCounter: (context) => 1 }), assign({ partner: (context) => "Bob" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Bill") !== -1, actions: [assign({ partnerCounter: (context) => 1 }), assign({ partner: (context) => "Bill" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Janet") !== -1, actions: [assign({ partnerCounter: (context) => 1 }), assign({ partner: (context) => "Janet" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Jason") !== -1, actions: [assign({ partnerCounter: (context) => 1 }), assign({ partner: (context) => "Jason" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Helen") !== -1, actions: [assign({ partnerCounter: (context) => 1 }), assign({ partner: (context) => "Helen" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Jim") !== -1, actions: [assign({ partnerCounter: (context) => 1 }), assign({ partner: (context) => "Jim" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("John") !== -1, actions: [assign({ partnerCounter: (context) => 1 }), assign({ partner: (context) => "John" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Lucy") !== -1, actions: [assign({ partnerCounter: (context) => 1 }), assign({ partner: (context) => "Lucy" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Margaret") !== -1, actions: [assign({ partnerCounter: (context) => 1 }), assign({ partner: (context) => "Margaret" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Maria") !== -1, actions: [assign({ partnerCounter: (context) => 1 }), assign({ partner: (context) => "Maria" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Mike") !== -1, actions: [assign({ partnerCounter: (context) => 1 }), assign({ partner: (context) => "Mike" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Peter") !== -1, actions: [assign({ partnerCounter: (context) => 1 }), assign({ partner: (context) => "Peter" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Tobias") !== -1, actions: [assign({ partnerCounter: (context) => 1 }), assign({ partner: (context) => "Tobias" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Kate") !== -1, actions: [assign({ partnerCounter: (context) => 1 }), assign({ partner: (context) => "Kate" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Jacob") !== -1, actions: [assign({ partnerCounter: (context) => 1 }), assign({ partner: (context) => "Jacob" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Tom") !== -1, actions: [assign({ partnerCounter: (context) => 1 }), assign({ partner: (context) => "Tom" })], target: 'done' },
                                        {
                                            cond: (context) => context.recResult[0].utterance.indexOf("Bob" || "Bill" || "Janet" || "Jason" || "Helen" || "Jim" || "John" || "Lucy" || "Margaret" || "Maria" || "Mike" ||
                                                "Peter" || "Tobias" || "Kate" || "Jacob" || "Tom") === -1, target: 'done'
                                        },
                                    ]
                                },
                                done: {
                                    type: 'final',
                                }
                            }
                        },

                        day: {
                            initial: 'verify',
                            states: {
                                verify: {
                                    always: [
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Monday") !== -1, actions: [assign({ dayCounter: (context) => 1 }), assign({ day: (context) => "Monday" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Tuesday") !== -1, actions: [assign({ dayCounter: (context) => 1 }), assign({ day: (context) => "Tuesday" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Wednesday") !== -1, actions: [assign({ dayCounter: (context) => 1 }), assign({ day: (context) => "Wednesday" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Thursday") !== -1, actions: [assign({ dayCounter: (context) => 1 }), assign({ day: (context) => "Thursday" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Friday") !== -1, actions: [assign({ dayCounter: (context) => 1 }), assign({ day: (context) => "Friday" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Saturday") !== -1, actions: [assign({ dayCounter: (context) => 1 }), assign({ day: (context) => "Saturday" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Sunday") !== -1, actions: [assign({ dayCounter: (context) => 1 }), assign({ day: (context) => "Sunday" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("today" || "Today") !== -1, actions: [assign({ dayCounter: (context) => 1 }), assign({ day: (context) => "today" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("tomorrow" || "Tomorrow") !== -1, actions: [assign({ dayCounter: (context) => 1 }), assign({ day: (context) => "tomorrow" })], target: 'done' },
                                        {
                                            cond: (context) => context.recResult[0].utterance.indexOf("Monday" || "Tuesday" || "Wednesday" || "Thursday" || "Friday" || "Saturday" || "Sunday" || "today" || "Today" ||
                                                "tomorrow" || "Tomorrow") === -1, target: 'done'
                                        },
                                    ]
                                },
                                done: {
                                    type: 'final',
                                }
                            }
                        },

                        time: {
                            initial: 'verify',
                            states: {
                                verify: {
                                    always: [
                                        // As visible above, we can put multiple strings as options for a match here but have a single value associated with them - this is also used in the "nomatch" condition.
                                        { cond: (context) => context.recResult[0].utterance.indexOf("noon" || "Noon") !== -1, actions: [assign({ timeCounter: (context) => 1 }), assign({ time: (context) => "noon" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("midday" || "Midday") !== -1, actions: [assign({ timeCounter: (context) => 1 }), assign({ time: (context) => "midday" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("10" || "10:00" || "ten" || "Ten") !== -1, actions: [assign({ timeCounter: (context) => 1 }), assign({ time: (context) => "10:00" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("11" || "11:00" || "eleven" || "Eleven") !== -1, actions: [assign({ timeCounter: (context) => 1 }), assign({ time: (context) => "11:00" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("12" || "12:00" || "twelve" || "Twelve") !== -1, actions: [assign({ timeCounter: (context) => 1 }), assign({ time: (context) => "12:00" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("1" || "1:00" || "one" || "One") !== -1, actions: [assign({ timeCounter: (context) => 1 }), assign({ time: (context) => "1:00" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("2" || "2:00" || "two" || "Two") !== -1, actions: [assign({ timeCounter: (context) => 1 }), assign({ time: (context) => "2:00" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("3" || "3:00" || "three" || "Three") !== -1, actions: [assign({ timeCounter: (context) => 1 }), assign({ time: (context) => "3:00" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("4" || "4:00" || "four" || "Four") !== -1, actions: [assign({ timeCounter: (context) => 1 }), assign({ time: (context) => "4:00" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("5" || "5:00" || "five" || "Five") !== -1, actions: [assign({ timeCounter: (context) => 1 }), assign({ time: (context) => "5:00" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("6" || "6:00" || "six" || "Six") !== -1, actions: [assign({ timeCounter: (context) => 1 }), assign({ time: (context) => "6:00" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("7" || "7:00" || "seven" || "Seven") !== -1, actions: [assign({ timeCounter: (context) => 1 }), assign({ time: (context) => "7:00" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("8" || "8:00" || "eight" || "Eight") !== -1, actions: [assign({ timeCounter: (context) => 1 }), assign({ time: (context) => "8:00" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("9" || "9:00" || "nine" || "Nine") !== -1, actions: [assign({ timeCounter: (context) => 1 }), assign({ time: (context) => "9:00" })], target: 'done' },
                                        {
                                            cond: (context) => context.recResult[0].utterance.indexOf("noon" || "Noon" || "midday" || "Midday" || "10" || "10:00" || "ten" || "Ten" || "11" || "11:00" || "eleven" || "Eleven" || "1" || "1:00" || "one" ||
                                                "One" || "2" || "2:00" || "two" || "Two" || "3" || "3:00" || "three" || "Three" || "4" || "4:00" || "four" || "Four" || "5" || "5:00" || "five" || "Five" || "6" || "6:00" || "six" || "Six" || "7" ||
                                                "7:00" || "seven" || "Seven" || "8" || "8:00" || "eight" || "Eight" || "9" || "9:00" || "nine" || "Nine") === -1, target: 'done'
                                        },
                                    ]
                                },
                                done: {
                                    type: 'final',
                                }
                            }
                        },
                    },
                    onDone: { target: "#root.dm.question" }  // when the partner, day, time states have either recognized something or not done so and moved to the final state
                },
            }
        },



        confirmTime: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'success',
                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                    },
                    {
                        target: 'question',
                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                        actions: [assign({ partnerCounter: (context) => 0 }), assign({ dayCounter: (context) => 0 }), assign({ timeCounter: (context) => 0 })]   // needed to start a new inquiry
                    },
                    {
                        target: '.nomatch'
                    }
                ],
                TIMEOUT: '.prompt'
            },

            states: {
                prompt: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `Do you want me to create a meeting with ${context.partner} for ${context.day} at ${context.time}?`
                    })),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I didn't get it. Could you repeat?"),
                    on: { ENDSPEECH: 'ask' }
                }
            }
        },

        success: {
            entry: say(`Your meeting has been created!`),
            on: {
                ENDSPEECH: { actions: [assign({ partnerCounter: (context) => 0 }), assign({ dayCounter: (context) => 0 }), assign({ timeCounter: (context) => 0 })], target: 'init' }  // needed to start a new inquiry
            }
        }
    }
})


