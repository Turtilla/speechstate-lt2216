import { MachineConfig, send, Action, assign } from "xstate";


function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}


const kbRequest = (text: string) =>
    fetch(new Request(`https://opentdb.com/api.php?amount=15&difficulty=${text}&type=multiple`)).then(data => data.json())

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
                TTS_READY: 'askForName',
                CLICK: 'askForName'
            }
        },

        getHelp: {
            initial: 'explain',
            states: {
                explain: {
                    entry: say(`The goal of the game is to answer 12 questions correctly. Answering each question increases your reward. You can choose to walk away with your winnings after answering a question correctly.
                                Answering a question incorrectly means you will only receive money from safety steps: $1000 at question 2 and $50000 at question 7. To help you you have 2 lifelines. The lifelines include
                                fifty-fifty, which will remove two of the incorrect answers and switch the question, which will change the question altogether. You can fifty-fifty a switched question, but you cannot switch a
                                question you used fifty-fifty on.
                                You can answer the questions by saying answer 1 or first answer, answer 2 or second answer, etc. It is important that you include the number so that it is easy for the system to understand.
                                You can ask to use lifelines by saying the name of the lifeline. You can ask for the question to be repeated by saying repeat. Between the questions you can quit the game by saying quit. You can
                                walk away with your winnings by saying walk away. You can inquire about the current question number by asking "how much money do I have?", and you can also ask "how many questions are left?".
                                Make sure to speak clearly and in phrases that the game can understand.`),
                    on: { ENDSPEECH: '#root.dm.playMillionaire.hist' },
                }
            }
        },

        askForName: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: '#root.dm.init',
                        cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
                    },
                    {
                        target: 'greet',
                        actions: assign({ username: (context) => context.recResult[0].utterance })
                    },
                ],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: say("Hi, what's your name?"),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                }
            }
        },

        greet: {
            entry: send((context) => ({
                type: 'SPEAK',
                value: `Welcome, nice to meet you, ${context.username}.`
            })),
            on: { ENDSPEECH: 'smallTalkHome' }
        },

        smallTalkHome: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'explaining',
                        cond: (context) => context.recResult[0].utterance.indexOf("skip") !== -1 || context.recResult[0].utterance.indexOf("Skip") !== -1,
                    },
                    {
                        target: '#root.dm.init',
                        cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
                    },
                    {
                        target: 'smallTalkJob',
                    }
                ],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: say("Where are you from?"),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                }
            }
        },

        smallTalkJob: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'explaining',
                        cond: (context) => context.recResult[0].utterance.indexOf("skip") !== -1 || context.recResult[0].utterance.indexOf("Skip") !== -1,
                    },
                    {
                        target: '#root.dm.init',
                        cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
                    },
                    {
                        target: 'approveOf',
                    }
                ],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: say("Sounds awesome! Tell us what you do for a living."),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                }
            }
        },

        approveOf: {
            entry: send((context) => ({
                type: 'SPEAK',
                value: `That sounds really exciting! But enough talk, let's move on.`
            })),
            on: { ENDSPEECH: 'explaining' }
        },

        explaining: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'explainRules',
                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}), 
                    },
                    {
                        target: 'selectDifficulty', 
                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                    },
                    {
                        target: '#root.dm.init',
                        cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
                    },
                    {
                        target: '.nomatch',
                    }
                ],
                TIMEOUT: { target: '.prompt' }
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `Would you like me to explain the rules for you?` 
                    })),
                    on: {
                        ENDSPEECH: 'ask'
                    }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I did not get that."),
                    on: { ENDSPEECH: 'prompt' }
                },
            },
        },

        explainRules: {
            entry: say(`The goal of the game is to answer 12 questions correctly. Answering each question increases your reward. You can choose to walk away with your winnings after answering a question correctly.
                                Answering a question incorrectly means you will only receive money from safety steps: $1000 at question 2 and $50000 at question 7. To help you you have 2 lifelines. The lifelines include
                                fifty-fifty, which will remove two of the incorrect answers and switch the question, which will change the question altogether. You can fifty-fifty a switched question, but you cannot switch a
                                question you used fifty-fifty on.
                                You can answer the questions by saying answer 1 or first answer, answer 2 or second answer, etc. It is important that you include the number so that it is easy for the system to understand.
                                You can ask to use lifelines by saying the name of the lifeline. You can ask for the question to be repeated by saying repeat. Between the questions you can quit the game by saying quit. You can
                                walk away with your winnings by saying walk away. You can inquire about the current question number by asking "how much money do I have?", and you can also ask "how many questions are left?".
                                Make sure to speak clearly and in phrases that the game can understand.`),
            on: { ENDSPEECH: 'selectDifficulty' }
        },

        selectDifficulty: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'fetchQuestions',
                        cond: (context) => context.recResult[0].utterance.indexOf("easy") !== -1 || context.recResult[0].utterance.indexOf("Easy") !== -1,
                        actions: assign({ difficulty: (context) => 'easy' })
                    },
                    {
                        target: 'fetchQuestions',
                        cond: (context) => context.recResult[0].utterance.indexOf("medium") !== -1 || context.recResult[0].utterance.indexOf("Medium") !== -1,
                        actions: assign({ difficulty: (context) => 'medium' })
                    },
                    {
                        target: 'fetchQuestions',
                        cond: (context) => context.recResult[0].utterance.indexOf("hard") !== -1 || context.recResult[0].utterance.indexOf("Hard") !== -1,
                        actions: assign({ difficulty: (context) => 'hard' })
                    },
                    {
                        target: '#root.dm.init',
                        cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
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
                        value: `What difficulty would you like to play on, ${context.username}?`
                    })),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I did not get what you said. Could you repeat?"),
                    on: { ENDSPEECH: 'ask' } 
                },
            }
        },

        fetchQuestions: {
            invoke: {
                id: 'getInfo',
                src: (context, event) => kbRequest(context.difficulty), 
                onDone: {
                    target: 'playMillionaire',
                    actions: [
                        assign({ safePoint: (context) => '$0' }),
                        assign({ currentMoney: (context) => '$0' }),
                        assign({ remainingQuestions: (context) => 12 }),
                        assign({ currentQuestion: (context) => 0 }),
                        assign({ counter: (context) => 0 }),
                        assign({ fiftyFiftyCounter: (context) => 0 }),
                        assign({ switchCounter: (context) => 0 }),

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

        playMillionaire: {
            initial: 'firstQuestion',
            states: {
                hist: {
                    type: 'history'
                },

                firstQuestion: {  // change
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => context.recResult[0].utterance.indexOf("help") !== -1 || context.recResult[0].utterance.indexOf("Help") !== -1
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
                            },
                            {
                                target: '.choose',
                                cond: (context) => context.recResult[0].utterance.indexOf("repeat") !== -1 || context.recResult[0].utterance.indexOf("Repeat") !== -1
                            },
                            {
                                target: '.fiftyFifty',
                                cond: (context) => context.recResult[0].utterance.indexOf("fifty") !== -1 || context.recResult[0].utterance.indexOf("Fifty") !== -1 ||
                                    context.recResult[0].utterance.indexOf("50") !== -1 || context.recResult[0].utterance.indexOf("5050") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.switchQuestion',
                                cond: (context) => context.recResult[0].utterance.indexOf("switch") !== -1 || context.recResult[0].utterance.indexOf("Switch") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.checkTrue', // change
                                cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                    context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "1" })
                            },
                            {
                                target: '.checkFalse', // change
                                cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "2" })
                            },
                            {
                                target: '.checkFalse', // change
                                cond: (context) => context.recResult[0].utterance.indexOf("third") !== -1 || context.recResult[0].utterance.indexOf("three") !== -1 || context.recResult[0].utterance.indexOf("3rd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("3") !== -1 || context.recResult[0].utterance.indexOf("Three") !== -1 || context.recResult[0].utterance.indexOf("Third") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "3" })]
                            },
                            {
                                target: '.checkFalse', // change
                                cond: (context) => context.recResult[0].utterance.indexOf("fourth") !== -1 || context.recResult[0].utterance.indexOf("four") !== -1 || context.recResult[0].utterance.indexOf("4th") !== -1 ||
                                    context.recResult[0].utterance.indexOf("4") !== -1 || context.recResult[0].utterance.indexOf("Four") !== -1 || context.recResult[0].utterance.indexOf("Fourth") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "4" })]
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 })
                            },
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: 'youFailed', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: send((context) => ({ // change
                                type: 'SPEAK', // corr answer A
                                value: `Okay, your first question is: ${context.question1} The possible answers are: 1. ${context.corrAnswer1}, 2. ${context.incorrAnswerOne1}, 3. ${context.incorrAnswerTwo1}, 4. ${context.incorrAnswerThree1}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt2: {
                            entry: send((context) => ({ // change
                                type: 'SPEAK', // corr answer A
                                value: `${context.question1} The possible answers are: 1. ${context.corrAnswer1}, 2. ${context.incorrAnswerOne1}, 3. ${context.incorrAnswerTwo1}, 4. ${context.incorrAnswerThree1}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt3: {
                            entry: send((context) => ({ // change
                                type: 'SPEAK', // corr answer A
                                value: `This is your last chance to answer this question: ${context.question1} The possible answers are: 1. ${context.corrAnswer1}, 2. ${context.incorrAnswerOne1}, 3. ${context.incorrAnswerTwo1}, 4. ${context.incorrAnswerThree1}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I did not get that."),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.firstQuestion' } // change
                        },
                        // check if sure
                        checkTrue: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'goodJob',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}), // change
                                        actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$500' }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.firstQuestion', // change
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?` // change
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        checkFalse: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'youFailed',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => 0 }),
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.firstQuestion', // change
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?` // change
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        // lifelines
                        // 50/50
                        fiftyFifty: {
                            initial: 'select',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '.checkTrue', // change
                                        cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                            context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "1" })
                                    },
                                    {
                                        target: '.checkFalse', // change
                                        cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                            context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "2" })
                                    },
                                    {
                                        target: '.nomatch',
                                        actions: assign({ counter: (context) => context.counter + 1 })
                                    }
                                ],
                                TIMEOUT: { target: '.select', actions: assign({ counter: (context) => context.counter + 1 }) }
                            },
                            states: {
                                select: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.fiftyFiftyCounter !== 0 },
                                        { target: 'reducedQuestion1', cond: (context) => context.counter === 0 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion2', cond: (context) => context.counter === 1 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion3', cond: (context) => context.counter === 2 && context.fiftyFiftyCounter === 0 },
                                        { target: '#root.dm.playMillionaire.firstQuestion.youFailed', cond: (context) => context.counter === 3 }, // change
                                    ]
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your fifty-fifty lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.firstQuestion' // change
                                    }
                                },
                                reducedQuestion1: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me take away two of the incorrect answers and re-read the question for you together with the remaining two options. ${context.question1}
                                                The remaining answers are: 1. ${context.corrAnswer1}, 2. ${context.incorrAnswerOne1}.` // change
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion2: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `${context.question1} The remaining answers are: 1. ${context.corrAnswer1}, 2. ${context.incorrAnswerOne1}.` // change
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion3: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `For the final time: ${context.question1}. The answers are: 1. ${context.corrAnswer1}, 2. ${context.incorrAnswerOne1}.` // change
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'select' }
                                },
                                checkTrue: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.firstQuestion.goodJob', // change
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$500' }), assign({ fiftyFiftyCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.firstQuestion.fiftyFifty', // change
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?` // change
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                                checkFalse: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.firstQuestion.youFailed', // change
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => 0 }), // add safe step whenever necessary
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.firstQuestion.fiftyFifty', // change
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?` // change
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                            },
                        },
                        // switchQuestion
                        switchQuestion: {
                            initial: 'choose',
                            states: {
                                choose: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.switchCounter !== 0 },
                                        { target: 'changeQuestion', cond: (context) => context.switchCounter === 0 },
                                    ]
                                },
                                changeQuestion: {
                                    entry: [send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me change your question to our backup question`
                                    })), assign({ extraQuestionMoney: (context) => "$500" }), assign({ switchCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })],
                                    on: { ENDSPEECH: '#root.dm.playMillionaire.extraQuestion' }
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your switch question lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.firstQuestion' // change
                                    }
                                },
                            }
                        },
                        // final states
                        goodJob: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Correct! ${context.corrAnswer1} was the right answer. You just earned $500!` // change
                            })),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.chitChat' }
                        },
                        youFailed: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `I'm sorry, but the correct answer was ${context.corrAnswer1}. You will have to go home with ${context.safePoint}` // change
                            })),
                            on: { ENDSPEECH: '#root.dm.init' }
                        },
                    }
                },

                secondQuestion: {
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => context.recResult[0].utterance.indexOf("help") !== -1 || context.recResult[0].utterance.indexOf("Help") !== -1
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
                            },
                            {
                                target: '.choose',
                                cond: (context) => context.recResult[0].utterance.indexOf("repeat") !== -1 || context.recResult[0].utterance.indexOf("Repeat") !== -1
                            },
                            {
                                target: '.fiftyFifty',
                                cond: (context) => context.recResult[0].utterance.indexOf("fifty") !== -1 || context.recResult[0].utterance.indexOf("Fifty") !== -1 ||
                                    context.recResult[0].utterance.indexOf("50") !== -1 || context.recResult[0].utterance.indexOf("5050") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.switchQuestion',
                                cond: (context) => context.recResult[0].utterance.indexOf("switch") !== -1 || context.recResult[0].utterance.indexOf("Switch") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.checkFalse',
                                cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                    context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "1" })
                            },
                            {
                                target: '.checkFalse',
                                cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "2" })
                            },
                            {
                                target: '.checkTrue',
                                cond: (context) => context.recResult[0].utterance.indexOf("third") !== -1 || context.recResult[0].utterance.indexOf("three") !== -1 || context.recResult[0].utterance.indexOf("3rd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("3") !== -1 || context.recResult[0].utterance.indexOf("Three") !== -1 || context.recResult[0].utterance.indexOf("Third") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "3" })]
                            },
                            {
                                target: '.checkFalse',
                                cond: (context) => context.recResult[0].utterance.indexOf("fourth") !== -1 || context.recResult[0].utterance.indexOf("four") !== -1 || context.recResult[0].utterance.indexOf("4th") !== -1 ||
                                    context.recResult[0].utterance.indexOf("4") !== -1 || context.recResult[0].utterance.indexOf("Four") !== -1 || context.recResult[0].utterance.indexOf("Fourth") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "4" })]
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 })
                            },
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: 'youFailed', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: send((context) => ({
                                type: 'SPEAK', // corr answer A
                                value: `Your second question is: ${context.question2} The possible answers are: 1. ${context.incorrAnswerTwo2}, 2. ${context.incorrAnswerOne2}, 3. ${context.corrAnswer2}, 4. ${context.incorrAnswerThree2}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt2: {
                            entry: send((context) => ({
                                type: 'SPEAK', // corr answer A
                                value: `${context.question1} The possible answers are: 1. ${context.incorrAnswerTwo2}, 2. ${context.incorrAnswerOne2}, 3. ${context.corrAnswer2}, 4. ${context.incorrAnswerThree2}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt3: {
                            entry: send((context) => ({
                                type: 'SPEAK', // corr answer A
                                value: `This is your last chance to answer this question: ${context.question2} The possible answers are:  1. ${context.incorrAnswerTwo2}, 2. ${context.incorrAnswerOne2}, 3. ${context.corrAnswer2}, 4. ${context.incorrAnswerThree2}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I did not get that."),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.secondQuestion' }
                        },
                        // check if sure
                        checkTrue: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'goodJob',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$1000' }), assign({ safePoint: (context) => '$1000' }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.secondQuestion',
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        checkFalse: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'youFailed',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: [assign({ counter: (context) => 0 }),] // add safe step whenever necessary
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.secondQuestion',
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        // lifelines
                        // 50/50
                        fiftyFifty: {
                            initial: 'select',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '.checkFalse',
                                        cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                            context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "1" })
                                    },
                                    {
                                        target: '.checkTrue',
                                        cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                            context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "2" })
                                    },
                                    {
                                        target: '.nomatch',
                                        actions: assign({ counter: (context) => context.counter + 1 })
                                    }
                                ],
                                TIMEOUT: { target: '.select', actions: assign({ counter: (context) => context.counter + 1 }) }
                            },
                            states: {
                                select: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.fiftyFiftyCounter !== 0 },
                                        { target: 'reducedQuestion1', cond: (context) => context.counter === 0 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion2', cond: (context) => context.counter === 1 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion3', cond: (context) => context.counter === 2 && context.fiftyFiftyCounter === 0 },
                                        { target: '#root.dm.playMillionaire.secondQuestion.youFailed', cond: (context) => context.counter === 3 },
                                    ]
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your fifty-fifty lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.secondQuestion'
                                    }
                                },
                                reducedQuestion1: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me take away two of the incorrect answers and re-read the question for you together with the remaining two options. ${context.question2}
                                                The remaining answers are: 1. ${context.incorrAnswerOne2}, 2. ${context.corrAnswer2}.`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion2: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `${context.question2} The remaining answers are: 1. ${context.incorrAnswerOne2}, 2. ${context.corrAnswer2}.`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion3: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `For the final time: ${context.question2}. The answers are: 1. ${context.incorrAnswerOne2}, 2. ${context.corrAnswer2}.`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'select' }
                                },
                                checkTrue: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.secondQuestion.goodJob',
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$1000' }), assign({ safePoint: (context) => '$1000' }), assign({ fiftyFiftyCounter: (context) => 1 }), assign({ safePoint: (context) => '$1000' }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.secondQuestion.fiftyFifty',
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                                checkFalse: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.secondQuestion.youFailed',
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => 0 }),
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.secondQuestion.fiftyFifty',
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                            },
                        },
                        // switchQuestion
                        switchQuestion: {
                            initial: 'choose',
                            states: {
                                choose: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.switchCounter !== 0 },
                                        { target: 'changeQuestion', cond: (context) => context.switchCounter === 0 },
                                    ]
                                },
                                changeQuestion: {
                                    entry: [send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me change your question to our backup question`
                                    })), assign({ extraQuestionMoney: (context) => "$1000" }), assign({ switchCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })],
                                    on: { ENDSPEECH: '#root.dm.playMillionaire.extraQuestion' }
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your switch question lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.secondQuestion'
                                    }
                                },
                            }
                        },
                        // final states
                        goodJob: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Correct! ${context.corrAnswer2} was the right answer. You just earned another $500!`
                            })),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.chitChat' }
                        },
                        youFailed: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `I'm sorry, but the correct answer was ${context.corrAnswer2}. You will have to go home with ${context.safePoint}`
                            })),
                            on: { ENDSPEECH: '#root.dm.init' }
                        },
                    }
                },

                thirdQuestion: {
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => context.recResult[0].utterance.indexOf("help") !== -1 || context.recResult[0].utterance.indexOf("Help") !== -1
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
                            },
                            {
                                target: '.choose',
                                cond: (context) => context.recResult[0].utterance.indexOf("repeat") !== -1 || context.recResult[0].utterance.indexOf("Repeat") !== -1
                            },
                            {
                                target: '.fiftyFifty',
                                cond: (context) => context.recResult[0].utterance.indexOf("fifty") !== -1 || context.recResult[0].utterance.indexOf("Fifty") !== -1 ||
                                    context.recResult[0].utterance.indexOf("50") !== -1 || context.recResult[0].utterance.indexOf("5050") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.switchQuestion',
                                cond: (context) => context.recResult[0].utterance.indexOf("switch") !== -1 || context.recResult[0].utterance.indexOf("Switch") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.checkFalse',
                                cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                    context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "1" })
                            },
                            {
                                target: '.checkFalse',
                                cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "2" })
                            },
                            {
                                target: '.checkTrue',
                                cond: (context) => context.recResult[0].utterance.indexOf("third") !== -1 || context.recResult[0].utterance.indexOf("three") !== -1 || context.recResult[0].utterance.indexOf("3rd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("3") !== -1 || context.recResult[0].utterance.indexOf("Three") !== -1 || context.recResult[0].utterance.indexOf("Third") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "3" })]
                            },
                            {
                                target: '.checkFalse',
                                cond: (context) => context.recResult[0].utterance.indexOf("fourth") !== -1 || context.recResult[0].utterance.indexOf("four") !== -1 || context.recResult[0].utterance.indexOf("4th") !== -1 ||
                                    context.recResult[0].utterance.indexOf("4") !== -1 || context.recResult[0].utterance.indexOf("Four") !== -1 || context.recResult[0].utterance.indexOf("Fourth") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "4" })]
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 })
                            },
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: 'youFailed', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: send((context) => ({
                                type: 'SPEAK', // corr answer A
                                value: `Your third question is: ${context.question3} The possible answers are: 1. ${context.incorrAnswerTwo3}, 2. ${context.incorrAnswerOne3}, 3. ${context.corrAnswer3}, 4. ${context.incorrAnswerThree3}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt2: {
                            entry: send((context) => ({
                                type: 'SPEAK', // corr answer A
                                value: `${context.question3} The possible answers are: 1. ${context.incorrAnswerTwo3}, 2. ${context.incorrAnswerOne3}, 3. ${context.corrAnswer3}, 4. ${context.incorrAnswerThree3}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt3: {
                            entry: send((context) => ({
                                type: 'SPEAK', // corr answer A
                                value: `This is your last chance to answer this question: ${context.question3} The possible answers are: 1. ${context.incorrAnswerTwo3}, 2. ${context.incorrAnswerOne3}, 3. ${context.corrAnswer3}, 4. ${context.incorrAnswerThree3}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I did not get that."),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.thirdQuestion' }
                        },
                        // check if sure
                        checkTrue: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'goodJob',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$2000' }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.thirdQuestion',
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        checkFalse: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'youFailed',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => 0 }),
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.thirdQuestion',
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        // lifelines
                        // 50/50
                        fiftyFifty: {
                            initial: 'select',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '.checkTrue',
                                        cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                            context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "1" })
                                    },
                                    {
                                        target: '.checkFalse',
                                        cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                            context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "2" })
                                    },
                                    {
                                        target: '.nomatch',
                                        actions: assign({ counter: (context) => context.counter + 1 })
                                    }
                                ],
                                TIMEOUT: { target: '.select', actions: assign({ counter: (context) => context.counter + 1 }) }
                            },
                            states: {
                                select: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.fiftyFiftyCounter !== 0 },
                                        { target: 'reducedQuestion1', cond: (context) => context.counter === 0 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion2', cond: (context) => context.counter === 1 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion3', cond: (context) => context.counter === 2 && context.fiftyFiftyCounter === 0 },
                                        { target: '#root.dm.playMillionaire.thirdQuestion.youFailed', cond: (context) => context.counter === 3 },
                                    ]
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your fifty-fifty lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.thirdQuestion'
                                    }
                                },
                                reducedQuestion1: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me take away two of the incorrect answers and re-read the question for you together with the remaining two options. ${context.question3}
                                                The remaining answers are: 1. ${context.corrAnswer3}, 2. ${context.incorrAnswerThree3}.`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion2: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `${context.question3} The remaining answers are: 1. ${context.corrAnswer3}, 2. ${context.incorrAnswerThree3}.`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion3: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `For the final time: ${context.question3} The remaining answers are: 1. ${context.corrAnswer3}, 2. ${context.incorrAnswerThree3}.` // change
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'select' }
                                },
                                checkTrue: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.thirdQuestion.goodJob',
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$2000' }), assign({ fiftyFiftyCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.thirdQuestion.fiftyFifty',
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                                checkFalse: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.thirdQuestion.youFailed',
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => 0 }),
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.thirdQuestion.fiftyFifty',
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                            },
                        },
                        // switchQuestion
                        switchQuestion: {
                            initial: 'choose',
                            states: {
                                choose: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.switchCounter !== 0 },
                                        { target: 'changeQuestion', cond: (context) => context.switchCounter === 0 },
                                    ]
                                },
                                changeQuestion: {
                                    entry: [send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me change your question to our backup question`
                                    })), assign({ extraQuestionMoney: (context) => "$2000" }), assign({ switchCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })],
                                    on: { ENDSPEECH: '#root.dm.playMillionaire.extraQuestion' }
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your switch question lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.thirdQuestion'
                                    }
                                },
                            }
                        },
                        // final states
                        goodJob: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Correct! ${context.corrAnswer3} was the right answer. Now you have $2000!`
                            })),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.chitChat' }
                        },
                        youFailed: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `I'm sorry, but the correct answer was ${context.corrAnswer3}. You will have to go home with ${context.safePoint}`
                            })),
                            on: { ENDSPEECH: '#root.dm.init' }
                        },
                    }
                },

                fourthQuestion: {  
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => context.recResult[0].utterance.indexOf("help") !== -1 || context.recResult[0].utterance.indexOf("Help") !== -1
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
                            },
                            {
                                target: '.choose',
                                cond: (context) => context.recResult[0].utterance.indexOf("repeat") !== -1 || context.recResult[0].utterance.indexOf("Repeat") !== -1
                            },
                            {
                                target: '.fiftyFifty',
                                cond: (context) => context.recResult[0].utterance.indexOf("fifty") !== -1 || context.recResult[0].utterance.indexOf("Fifty") !== -1 ||
                                    context.recResult[0].utterance.indexOf("50") !== -1 || context.recResult[0].utterance.indexOf("5050") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.switchQuestion',
                                cond: (context) => context.recResult[0].utterance.indexOf("switch") !== -1 || context.recResult[0].utterance.indexOf("Switch") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.checkFalse', 
                                cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                    context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "1" })
                            },
                            {
                                target: '.checkTrue', 
                                cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "2" })
                            },
                            {
                                target: '.checkFalse', 
                                cond: (context) => context.recResult[0].utterance.indexOf("third") !== -1 || context.recResult[0].utterance.indexOf("three") !== -1 || context.recResult[0].utterance.indexOf("3rd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("3") !== -1 || context.recResult[0].utterance.indexOf("Three") !== -1 || context.recResult[0].utterance.indexOf("Third") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "3" })]
                            },
                            {
                                target: '.checkFalse', 
                                cond: (context) => context.recResult[0].utterance.indexOf("fourth") !== -1 || context.recResult[0].utterance.indexOf("four") !== -1 || context.recResult[0].utterance.indexOf("4th") !== -1 ||
                                    context.recResult[0].utterance.indexOf("4") !== -1 || context.recResult[0].utterance.indexOf("Four") !== -1 || context.recResult[0].utterance.indexOf("Fourth") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "4" })]
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 })
                            },
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: 'youFailed', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: send((context) => ({ 
                                type: 'SPEAK', // corr answer B
                                value: `Your first question is: ${context.question4} The possible answers are: 1. ${context.incorrAnswerOne4}, 2. ${context.corrAnswer4}, 3. ${context.incorrAnswerTwo4}, 4. ${context.incorrAnswerThree4}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt2: {
                            entry: send((context) => ({ 
                                type: 'SPEAK', // corr answer B
                                value: `${context.question4} The possible answers are: 1. ${context.incorrAnswerOne4}, 2. ${context.corrAnswer4}, 3. ${context.incorrAnswerTwo4}, 4. ${context.incorrAnswerThree4}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt3: {
                            entry: send((context) => ({ 
                                type: 'SPEAK', // corr answer B
                                value: `This is your last chance to answer this question: ${context.question4} The possible answers are: 1. ${context.incorrAnswerOne4}, 2. ${context.corrAnswer4}, 3. ${context.incorrAnswerTwo4}, 4. ${context.incorrAnswerThree4}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I did not get that."),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.fourthQuestion' } 
                        },
                        // check if sure
                        checkTrue: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'goodJob',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}), 
                                        actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$5000' }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.fourthQuestion', 
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?` 
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        checkFalse: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'youFailed',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => 0 }),
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.fourthQuestion', 
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?` 
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        // lifelines
                        // 50/50
                        fiftyFifty: {
                            initial: 'select',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '.checkTrue', 
                                        cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                            context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "1" })
                                    },
                                    {
                                        target: '.checkFalse', 
                                        cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                            context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "2" })
                                    },
                                    {
                                        target: '.nomatch',
                                        actions: assign({ counter: (context) => context.counter + 1 })
                                    }
                                ],
                                TIMEOUT: { target: '.select', actions: assign({ counter: (context) => context.counter + 1 }) }
                            },
                            states: {
                                select: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.fiftyFiftyCounter !== 0 },
                                        { target: 'reducedQuestion1', cond: (context) => context.counter === 0 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion2', cond: (context) => context.counter === 1 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion3', cond: (context) => context.counter === 2 && context.fiftyFiftyCounter === 0 },
                                        { target: '#root.dm.playMillionaire.fourthQuestion.youFailed', cond: (context) => context.counter === 3 }, 
                                    ]
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your fifty-fifty lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.fourthQuestion' 
                                    }
                                },
                                reducedQuestion1: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me take away two of the incorrect answers and re-read the question for you together with the remaining two options. ${context.question4}
                                                The remaining answers are: 1. ${context.corrAnswer4}, 2. ${context.incorrAnswerThree4}.` 
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion2: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `${context.question4} The remaining answers are: 1. ${context.corrAnswer4}, 2. ${context.incorrAnswerThree4}.` 
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion3: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `For the final time: ${context.question4}. The answers are: 1. ${context.corrAnswer4}, 2. ${context.incorrAnswerThree4}.` 
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'select' }
                                },
                                checkTrue: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.fourthQuestion.goodJob', 
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$5000' }), assign({ fiftyFiftyCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.fourthQuestion.fiftyFifty', 
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?` 
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                                checkFalse: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.fourthQuestion.youFailed', 
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => 0 }), 
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.fourthQuestion.fiftyFifty',
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?` 
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                            },
                        },
                        // switchQuestion
                        switchQuestion: {
                            initial: 'choose',
                            states: {
                                choose: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.switchCounter !== 0 },
                                        { target: 'changeQuestion', cond: (context) => context.switchCounter === 0 },
                                    ]
                                },
                                changeQuestion: {
                                    entry: [send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me change your question to our backup question`
                                    })), assign({ extraQuestionMoney: (context) => "$5000" }), assign({ switchCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })],
                                    on: { ENDSPEECH: '#root.dm.playMillionaire.extraQuestion' }
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your switch question lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.fourthQuestion' 
                                    }
                                },
                            }
                        },
                        // final states
                        goodJob: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Correct! ${context.corrAnswer4} was the right answer. Now you have a total of $5000!`
                            })),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.chitChat' }
                        },
                        youFailed: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `I'm sorry, but the correct answer was ${context.corrAnswer4}. You will have to go home with ${context.safePoint}` // change
                            })),
                            on: { ENDSPEECH: '#root.dm.init' }
                        },
                    }
                },

                fifthQuestion: {  
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => context.recResult[0].utterance.indexOf("help") !== -1 || context.recResult[0].utterance.indexOf("Help") !== -1
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
                            },
                            {
                                target: '.choose',
                                cond: (context) => context.recResult[0].utterance.indexOf("repeat") !== -1 || context.recResult[0].utterance.indexOf("Repeat") !== -1
                            },
                            {
                                target: '.fiftyFifty',
                                cond: (context) => context.recResult[0].utterance.indexOf("fifty") !== -1 || context.recResult[0].utterance.indexOf("Fifty") !== -1 ||
                                    context.recResult[0].utterance.indexOf("50") !== -1 || context.recResult[0].utterance.indexOf("5050") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.switchQuestion',
                                cond: (context) => context.recResult[0].utterance.indexOf("switch") !== -1 || context.recResult[0].utterance.indexOf("Switch") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.checkTrue', 
                                cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                    context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "1" })
                            },
                            {
                                target: '.checkFalse', 
                                cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "2" })
                            },
                            {
                                target: '.checkFalse', 
                                cond: (context) => context.recResult[0].utterance.indexOf("third") !== -1 || context.recResult[0].utterance.indexOf("three") !== -1 || context.recResult[0].utterance.indexOf("3rd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("3") !== -1 || context.recResult[0].utterance.indexOf("Three") !== -1 || context.recResult[0].utterance.indexOf("Third") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "3" })]
                            },
                            {
                                target: '.checkFalse', 
                                cond: (context) => context.recResult[0].utterance.indexOf("fourth") !== -1 || context.recResult[0].utterance.indexOf("four") !== -1 || context.recResult[0].utterance.indexOf("4th") !== -1 ||
                                    context.recResult[0].utterance.indexOf("4") !== -1 || context.recResult[0].utterance.indexOf("Four") !== -1 || context.recResult[0].utterance.indexOf("Fourth") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "4" })]
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 })
                            },
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: 'youFailed', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: send((context) => ({ 
                                type: 'SPEAK', // corr answer A
                                value: `Your first question is: ${context.question5} The possible answers are: 1. ${context.corrAnswer5}, 2. ${context.incorrAnswerOne5}, 3. ${context.incorrAnswerTwo5}, 4. ${context.incorrAnswerThree5}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt2: {
                            entry: send((context) => ({  
                                type: 'SPEAK', // corr answer A
                                value: `${context.question5} The possible answers are: 1. ${context.corrAnswer5}, 2. ${context.incorrAnswerOne5}, 3. ${context.incorrAnswerTwo5}, 4. ${context.incorrAnswerThree5}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt3: {
                            entry: send((context) => ({  
                                type: 'SPEAK', // corr answer A
                                value: `This is your last chance to answer this question: ${context.question5} The possible answers are: 1. ${context.corrAnswer5}, 2. ${context.incorrAnswerOne5}, 3. ${context.incorrAnswerTwo5}, 4. ${context.incorrAnswerThree5}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I did not get that."),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.fifthQuestion' }  
                        },
                        // check if sure
                        checkTrue: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'goodJob',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),  
                                        actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$10000' }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.fifthQuestion',  
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        checkFalse: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'youFailed',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => 0 }),
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.fifthQuestion', 
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?` 
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        // lifelines
                        // 50/50
                        fiftyFifty: {
                            initial: 'select',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '.checkTrue', 
                                        cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                            context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "1" })
                                    },
                                    {
                                        target: '.checkFalse', 
                                        cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                            context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "2" })
                                    },
                                    {
                                        target: '.nomatch',
                                        actions: assign({ counter: (context) => context.counter + 1 })
                                    }
                                ],
                                TIMEOUT: { target: '.select', actions: assign({ counter: (context) => context.counter + 1 }) }
                            },
                            states: {
                                select: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.fiftyFiftyCounter !== 0 },
                                        { target: 'reducedQuestion1', cond: (context) => context.counter === 0 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion2', cond: (context) => context.counter === 1 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion3', cond: (context) => context.counter === 2 && context.fiftyFiftyCounter === 0 },
                                        { target: '#root.dm.playMillionaire.fifthQuestion.youFailed', cond: (context) => context.counter === 3 }, 
                                    ]
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your fifty-fifty lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.fifthQuestion' 
                                    }
                                },
                                reducedQuestion1: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me take away two of the incorrect answers and re-read the question for you together with the remaining two options. ${context.question5}
                                                The remaining answers are: 1. ${context.corrAnswer5}, 2. ${context.incorrAnswerTwo5}.` 
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion2: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `${context.question1} The remaining answers are: 1. ${context.corrAnswer5}, 2. ${context.incorrAnswerTwo5}.`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion3: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `For the final time: ${context.question1}. The answers are: 1. ${context.corrAnswer5}, 2. ${context.incorrAnswerTwo5}.`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'select' }
                                },
                                checkTrue: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.fifthQuestion.goodJob', 
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$10000' }), assign({ fiftyFiftyCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.firstQuestion.fiftyFifty',  
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`  
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                                checkFalse: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.fifthQuestion.youFailed', 
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => 0 }), 
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.fifthQuestion.fiftyFifty', 
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?` 
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                            },
                        },
                        // switchQuestion
                        switchQuestion: {
                            initial: 'choose',
                            states: {
                                choose: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.switchCounter !== 0 },
                                        { target: 'changeQuestion', cond: (context) => context.switchCounter === 0 },
                                    ]
                                },
                                changeQuestion: {
                                    entry: [send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me change your question to our backup question`
                                    })), assign({ extraQuestionMoney: (context) => "$10000" }), assign({ switchCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })],
                                    on: { ENDSPEECH: '#root.dm.playMillionaire.extraQuestion' }
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your switch question lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.fifthQuestion' 
                                    }
                                },
                            }
                        },
                        // final states
                        goodJob: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Correct! ${context.corrAnswer5} was the right answer. You just doubled your winnings!`  
                            })),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.chitChat' }
                        },
                        youFailed: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `I'm sorry, but the correct answer was ${context.corrAnswer5}. You will have to go home with ${context.safePoint}` 
                            })),
                            on: { ENDSPEECH: '#root.dm.init' }
                        },
                    }
                },

                sixthQuestion: {   
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => context.recResult[0].utterance.indexOf("help") !== -1 || context.recResult[0].utterance.indexOf("Help") !== -1
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
                            },
                            {
                                target: '.choose',
                                cond: (context) => context.recResult[0].utterance.indexOf("repeat") !== -1 || context.recResult[0].utterance.indexOf("Repeat") !== -1
                            },
                            {
                                target: '.fiftyFifty',
                                cond: (context) => context.recResult[0].utterance.indexOf("fifty") !== -1 || context.recResult[0].utterance.indexOf("Fifty") !== -1 ||
                                    context.recResult[0].utterance.indexOf("50") !== -1 || context.recResult[0].utterance.indexOf("5050") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.switchQuestion',
                                cond: (context) => context.recResult[0].utterance.indexOf("switch") !== -1 || context.recResult[0].utterance.indexOf("Switch") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.checkFalse',  
                                cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                    context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "1" })
                            },
                            {
                                target: '.checkFalse',  
                                cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "2" })
                            },
                            {
                                target: '.checkFalse',  
                                cond: (context) => context.recResult[0].utterance.indexOf("third") !== -1 || context.recResult[0].utterance.indexOf("three") !== -1 || context.recResult[0].utterance.indexOf("3rd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("3") !== -1 || context.recResult[0].utterance.indexOf("Three") !== -1 || context.recResult[0].utterance.indexOf("Third") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "3" })]
                            },
                            {
                                target: '.checkTrue', 
                                cond: (context) => context.recResult[0].utterance.indexOf("fourth") !== -1 || context.recResult[0].utterance.indexOf("four") !== -1 || context.recResult[0].utterance.indexOf("4th") !== -1 ||
                                    context.recResult[0].utterance.indexOf("4") !== -1 || context.recResult[0].utterance.indexOf("Four") !== -1 || context.recResult[0].utterance.indexOf("Fourth") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "4" })]
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 })
                            },
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: 'youFailed', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: send((context) => ({ 
                                type: 'SPEAK', 
                                value: `Your next question is: ${context.question6} The possible answers are: 1. ${context.incorrAnswerThree6}, 2. ${context.incorrAnswerOne6}, 3. ${context.incorrAnswerTwo6}, 4. ${context.corrAnswer6}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt2: {
                            entry: send((context) => ({ 
                                type: 'SPEAK', 
                                value: `${context.question6} The possible answers are: 1. ${context.incorrAnswerThree6}, 2. ${context.incorrAnswerOne6}, 3. ${context.incorrAnswerTwo6}, 4. ${context.corrAnswer6}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt3: {
                            entry: send((context) => ({
                                type: 'SPEAK', 
                                value: `This is your last chance to answer this question: ${context.question6} The possible answers are: 1. ${context.incorrAnswerThree6}, 2. ${context.incorrAnswerOne6}, 3. ${context.incorrAnswerTwo6}, 4. ${context.corrAnswer6}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I did not get that."),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.sixthQuestion' }  
                        },
                        // check if sure
                        checkTrue: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'goodJob',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),  
                                        actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$20000' }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.sixthQuestion', 
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        checkFalse: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'youFailed',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => 0 }),
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.sixthQuestion',  
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        // lifelines
                        // 50/50
                        fiftyFifty: {
                            initial: 'select',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '.checkFalse',  
                                        cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                            context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "1" })
                                    },
                                    {
                                        target: '.checkTrue',  
                                        cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                            context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "2" })
                                    },
                                    {
                                        target: '.nomatch',
                                        actions: assign({ counter: (context) => context.counter + 1 })
                                    }
                                ],
                                TIMEOUT: { target: '.select', actions: assign({ counter: (context) => context.counter + 1 }) }
                            },
                            states: {
                                select: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.fiftyFiftyCounter !== 0 },
                                        { target: 'reducedQuestion1', cond: (context) => context.counter === 0 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion2', cond: (context) => context.counter === 1 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion3', cond: (context) => context.counter === 2 && context.fiftyFiftyCounter === 0 },
                                        { target: '#root.dm.playMillionaire.sixthQuestion.youFailed', cond: (context) => context.counter === 3 },  
                                    ]
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your fifty-fifty lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.sixthQuestion' // change
                                    }
                                },
                                reducedQuestion1: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me take away two of the incorrect answers and re-read the question for you together with the remaining two options. ${context.question6}
                                                The remaining answers are: 1. ${context.incorrAnswerOne6}, 2. ${context.corrAnswer6}.` // change
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion2: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `${context.question6} The remaining answers are: 1. ${context.incorrAnswerOne6}, 2. ${context.corrAnswer6}.`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion3: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `For the final time: ${context.question6}. The answers are: 1. ${context.incorrAnswerOne6}, 2. ${context.corrAnswer6}.`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'select' }
                                },
                                checkTrue: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.sixthQuestion.goodJob',  
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$20000' }), assign({ fiftyFiftyCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.sixthQuestion.fiftyFifty',  
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`  
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                                checkFalse: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.sixthQuestion.youFailed',  
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => 0 }),  
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.sixthQuestion.fiftyFifty',  
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`  
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                            },
                        },
                        // switchQuestion
                        switchQuestion: {
                            initial: 'choose',
                            states: {
                                choose: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.switchCounter !== 0 },
                                        { target: 'changeQuestion', cond: (context) => context.switchCounter === 0 },
                                    ]
                                },
                                changeQuestion: {
                                    entry: [send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me change your question to our backup question`
                                    })), assign({ extraQuestionMoney: (context) => "$20000" }), assign({ switchCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })],
                                    on: { ENDSPEECH: '#root.dm.playMillionaire.extraQuestion' }
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your switch question lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.sixthQuestion'  
                                    }
                                },
                            }
                        },
                        // final states
                        goodJob: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Correct! ${context.corrAnswer6} was the right answer. You are now at $20000!` // change
                            })),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.chitChat' }
                        },
                        youFailed: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `I'm sorry, but the correct answer was ${context.corrAnswer6}. You will have to go home with ${context.safePoint}` // change
                            })),
                            on: { ENDSPEECH: '#root.dm.init' }
                        },
                    }
                },

                seventhQuestion: {   
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => context.recResult[0].utterance.indexOf("help") !== -1 || context.recResult[0].utterance.indexOf("Help") !== -1
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
                            },
                            {
                                target: '.choose',
                                cond: (context) => context.recResult[0].utterance.indexOf("repeat") !== -1 || context.recResult[0].utterance.indexOf("Repeat") !== -1
                            },
                            {
                                target: '.fiftyFifty',
                                cond: (context) => context.recResult[0].utterance.indexOf("fifty") !== -1 || context.recResult[0].utterance.indexOf("Fifty") !== -1 ||
                                    context.recResult[0].utterance.indexOf("50") !== -1 || context.recResult[0].utterance.indexOf("5050") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.switchQuestion',
                                cond: (context) => context.recResult[0].utterance.indexOf("switch") !== -1 || context.recResult[0].utterance.indexOf("Switch") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.checkFalse',  
                                cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                    context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "1" })
                            },
                            {
                                target: '.checkFalse',  
                                cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "2" })
                            },
                            {
                                target: '.checkFalse',  
                                cond: (context) => context.recResult[0].utterance.indexOf("third") !== -1 || context.recResult[0].utterance.indexOf("three") !== -1 || context.recResult[0].utterance.indexOf("3rd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("3") !== -1 || context.recResult[0].utterance.indexOf("Three") !== -1 || context.recResult[0].utterance.indexOf("Third") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "3" })]
                            },
                            {
                                target: '.checkTrue',  
                                cond: (context) => context.recResult[0].utterance.indexOf("fourth") !== -1 || context.recResult[0].utterance.indexOf("four") !== -1 || context.recResult[0].utterance.indexOf("4th") !== -1 ||
                                    context.recResult[0].utterance.indexOf("4") !== -1 || context.recResult[0].utterance.indexOf("Four") !== -1 || context.recResult[0].utterance.indexOf("Fourth") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "4" })]
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 })
                            },
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: 'youFailed', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: send((context) => ({  
                                type: 'SPEAK',  
                                value: `Your first question is: ${context.question7} The possible answers are: 1. ${context.incorrAnswerThree7}, 2. ${context.incorrAnswerOne7}, 3. ${context.incorrAnswerTwo7}, 4. ${context.corrAnswer7}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt2: {
                            entry: send((context) => ({  
                                type: 'SPEAK',  
                                value: `${context.question7} The possible answers are: 1. ${context.incorrAnswerThree7}, 2. ${context.incorrAnswerOne7}, 3. ${context.incorrAnswerTwo7}, 4. ${context.corrAnswer7}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt3: {
                            entry: send((context) => ({  
                                type: 'SPEAK',  
                                value: `This is your last chance to answer this question: ${context.question7} The possible answers are:  1. ${context.incorrAnswerThree7}, 2. ${context.incorrAnswerOne7}, 3. ${context.incorrAnswerTwo7}, 4. ${context.corrAnswer7}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I did not get that."),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.seventhQuestion' }  
                        },
                        // check if sure
                        checkTrue: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'goodJob',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$50000' }), assign({ safePoint: (context) => '$50000' }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.seventhQuestion', 
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        checkFalse: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'youFailed',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => 0 }),
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.seventhQuestion',  
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        // lifelines
                        // 50/50
                        fiftyFifty: {
                            initial: 'select',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '.checkFalse',  
                                        cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                            context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "1" })
                                    },
                                    {
                                        target: '.checkTrue',  
                                        cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                            context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "2" })
                                    },
                                    {
                                        target: '.nomatch',
                                        actions: assign({ counter: (context) => context.counter + 1 })
                                    }
                                ],
                                TIMEOUT: { target: '.select', actions: assign({ counter: (context) => context.counter + 1 }) }
                            },
                            states: {
                                select: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.fiftyFiftyCounter !== 0 },
                                        { target: 'reducedQuestion1', cond: (context) => context.counter === 0 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion2', cond: (context) => context.counter === 1 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion3', cond: (context) => context.counter === 2 && context.fiftyFiftyCounter === 0 },
                                        { target: '#root.dm.playMillionaire.seventhQuestion.youFailed', cond: (context) => context.counter === 3 },  
                                    ]
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your fifty-fifty lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.seventhQuestion'  
                                    }
                                },
                                reducedQuestion1: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me take away two of the incorrect answers and re-read the question for you together with the remaining two options. ${context.question7}
                                                The remaining answers are: 1. ${context.incorrAnswerOne7}, 2. ${context.corrAnswer7}.`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion2: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `${context.question7} The remaining answers are: 1. ${context.incorrAnswerOne7}, 2. ${context.corrAnswer7}.`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion3: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `For the final time: ${context.question7}. The answers are: 1. ${context.incorrAnswerOne7}, 2. ${context.corrAnswer7}.`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'select' }
                                },
                                checkTrue: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.seventhQuestion.goodJob',  
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$50000' }), assign({ safePoint: (context) => '$50000' }), assign({ fiftyFiftyCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.seventhQuestion.fiftyFifty',  
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`  
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                                checkFalse: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.seventhQuestion.youFailed',  
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => 0 }),  
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.seventhQuestion.fiftyFifty',  
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`  
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                            },
                        },
                        // switchQuestion
                        switchQuestion: {
                            initial: 'choose',
                            states: {
                                choose: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.switchCounter !== 0 },
                                        { target: 'changeQuestion', cond: (context) => context.switchCounter === 0 },
                                    ]
                                },
                                changeQuestion: {
                                    entry: [send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me change your question to our backup question`
                                    })), assign({ extraQuestionMoney: (context) => "$50000" }), assign({ switchCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })],
                                    on: { ENDSPEECH: '#root.dm.playMillionaire.extraQuestion' }
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your switch question lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.seventhQuestion'  
                                    }
                                },
                            }
                        },
                        // final states
                        goodJob: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Correct! ${context.corrAnswer7} was the right answer. You are now at $50000!` // change
                            })),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.chitChat' }
                        },
                        youFailed: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `I'm sorry, but the correct answer was ${context.corrAnswer7}. You will have to go home with ${context.safePoint}` // change
                            })),
                            on: { ENDSPEECH: '#root.dm.init' }
                        },
                    }
                },

                eighthQuestion: {   
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => context.recResult[0].utterance.indexOf("help") !== -1 || context.recResult[0].utterance.indexOf("Help") !== -1
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
                            },
                            {
                                target: '.choose',
                                cond: (context) => context.recResult[0].utterance.indexOf("repeat") !== -1 || context.recResult[0].utterance.indexOf("Repeat") !== -1
                            },
                            {
                                target: '.fiftyFifty',
                                cond: (context) => context.recResult[0].utterance.indexOf("fifty") !== -1 || context.recResult[0].utterance.indexOf("Fifty") !== -1 ||
                                    context.recResult[0].utterance.indexOf("50") !== -1 || context.recResult[0].utterance.indexOf("5050") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.switchQuestion',
                                cond: (context) => context.recResult[0].utterance.indexOf("switch") !== -1 || context.recResult[0].utterance.indexOf("Switch") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.checkFalse', 
                                cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                    context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "1" })
                            },
                            {
                                target: '.checkTrue', 
                                cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "2" })
                            },
                            {
                                target: '.checkFalse', 
                                cond: (context) => context.recResult[0].utterance.indexOf("third") !== -1 || context.recResult[0].utterance.indexOf("three") !== -1 || context.recResult[0].utterance.indexOf("3rd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("3") !== -1 || context.recResult[0].utterance.indexOf("Three") !== -1 || context.recResult[0].utterance.indexOf("Third") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "3" })]
                            },
                            {
                                target: '.checkFalse', 
                                cond: (context) => context.recResult[0].utterance.indexOf("fourth") !== -1 || context.recResult[0].utterance.indexOf("four") !== -1 || context.recResult[0].utterance.indexOf("4th") !== -1 ||
                                    context.recResult[0].utterance.indexOf("4") !== -1 || context.recResult[0].utterance.indexOf("Four") !== -1 || context.recResult[0].utterance.indexOf("Fourth") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "4" })]
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 })
                            },
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: 'youFailed', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: send((context) => ({  
                                type: 'SPEAK',  
                                value: `Your first question is: ${context.question8} The possible answers are: 1. ${context.incorrAnswerOne8}, 2. ${context.corrAnswer8}, 3. ${context.incorrAnswerTwo8}, 4. ${context.incorrAnswerThree8}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt2: {
                            entry: send((context) => ({ 
                                type: 'SPEAK', 
                                value: `${context.question8} The possible answers are: 1. ${context.incorrAnswerOne8}, 2. ${context.corrAnswer8}, 3. ${context.incorrAnswerTwo8}, 4. ${context.incorrAnswerThree8}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt3: {
                            entry: send((context) => ({ 
                                type: 'SPEAK', 
                                value: `This is your last chance to answer this question: ${context.question8} The possible answers are: 1. ${context.incorrAnswerOne8}, 2. ${context.corrAnswer8}, 3. ${context.incorrAnswerTwo8}, 4. ${context.incorrAnswerThree8}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I did not get that."),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.eighthQuestion' }  
                        },
                        // check if sure
                        checkTrue: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'goodJob',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),  
                                        actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$75000' }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.eighthQuestion',  
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        checkFalse: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'youFailed',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => 0 }),
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.eighthQuestion',  
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        // lifelines
                        // 50/50
                        fiftyFifty: {
                            initial: 'select',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '.checkTrue',  
                                        cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                            context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "1" })
                                    },
                                    {
                                        target: '.checkFalse', 
                                        cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                            context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "2" })
                                    },
                                    {
                                        target: '.nomatch',
                                        actions: assign({ counter: (context) => context.counter + 1 })
                                    }
                                ],
                                TIMEOUT: { target: '.select', actions: assign({ counter: (context) => context.counter + 1 }) }
                            },
                            states: {
                                select: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.fiftyFiftyCounter !== 0 },
                                        { target: 'reducedQuestion1', cond: (context) => context.counter === 0 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion2', cond: (context) => context.counter === 1 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion3', cond: (context) => context.counter === 2 && context.fiftyFiftyCounter === 0 },
                                        { target: '#root.dm.playMillionaire.eighthQuestion.youFailed', cond: (context) => context.counter === 3 }, 
                                    ]
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your fifty-fifty lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.eighthQuestion'  
                                    }
                                },
                                reducedQuestion1: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me take away two of the incorrect answers and re-read the question for you together with the remaining two options. ${context.question8}
                                                The remaining answers are: 1. ${context.corrAnswer8}, 2. ${context.incorrAnswerThree8}.`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion2: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `${context.question8} The remaining answers are: 1. ${context.corrAnswer8}, 2. ${context.incorrAnswerThree8}.`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion3: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `For the final time: ${context.question8}. The answers are: 1. ${context.corrAnswer8}, 2. ${context.incorrAnswerThree8}.` 
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'select' }
                                },
                                checkTrue: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.eighthQuestion.goodJob', 
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$75000' }), assign({ fiftyFiftyCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.eighthQuestion.fiftyFifty',  
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`  
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                                checkFalse: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.eighthQuestion.youFailed',  
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => 0 }),  
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.eighthQuestion.fiftyFifty',  
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`  
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                            },
                        },
                        // switchQuestion
                        switchQuestion: {
                            initial: 'choose',
                            states: {
                                choose: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.switchCounter !== 0 },
                                        { target: 'changeQuestion', cond: (context) => context.switchCounter === 0 },
                                    ]
                                },
                                changeQuestion: {
                                    entry: [send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me change your question to our backup question`
                                    })), assign({ extraQuestionMoney: (context) => "$75000" }), assign({ switchCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })],
                                    on: { ENDSPEECH: '#root.dm.playMillionaire.extraQuestion' }
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your switch question lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.eighthQuestion' 
                                    }
                                },
                            }
                        },
                        // final states
                        goodJob: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Correct! ${context.corrAnswer8} was the right answer. You just earned $25000!` 
                            })),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.chitChat' }
                        },
                        youFailed: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `I'm sorry, but the correct answer was ${context.corrAnswer8}. You will have to go home with ${context.safePoint}` 
                            })),
                            on: { ENDSPEECH: '#root.dm.init' }
                        },
                    }
                },

                ninthQuestion: {   
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => context.recResult[0].utterance.indexOf("help") !== -1 || context.recResult[0].utterance.indexOf("Help") !== -1
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
                            },
                            {
                                target: '.choose',
                                cond: (context) => context.recResult[0].utterance.indexOf("repeat") !== -1 || context.recResult[0].utterance.indexOf("Repeat") !== -1
                            },
                            {
                                target: '.fiftyFifty',
                                cond: (context) => context.recResult[0].utterance.indexOf("fifty") !== -1 || context.recResult[0].utterance.indexOf("Fifty") !== -1 ||
                                    context.recResult[0].utterance.indexOf("50") !== -1 || context.recResult[0].utterance.indexOf("5050") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.switchQuestion',
                                cond: (context) => context.recResult[0].utterance.indexOf("switch") !== -1 || context.recResult[0].utterance.indexOf("Switch") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.checkFalse',  
                                cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                    context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "1" })
                            },
                            {
                                target: '.checkFalse',  
                                cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "2" })
                            },
                            {
                                target: '.checkTrue',  
                                cond: (context) => context.recResult[0].utterance.indexOf("third") !== -1 || context.recResult[0].utterance.indexOf("three") !== -1 || context.recResult[0].utterance.indexOf("3rd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("3") !== -1 || context.recResult[0].utterance.indexOf("Three") !== -1 || context.recResult[0].utterance.indexOf("Third") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "3" })]
                            },
                            {
                                target: '.checkFalse',  
                                cond: (context) => context.recResult[0].utterance.indexOf("fourth") !== -1 || context.recResult[0].utterance.indexOf("four") !== -1 || context.recResult[0].utterance.indexOf("4th") !== -1 ||
                                    context.recResult[0].utterance.indexOf("4") !== -1 || context.recResult[0].utterance.indexOf("Four") !== -1 || context.recResult[0].utterance.indexOf("Fourth") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "4" })]
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 })
                            },
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: 'youFailed', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: send((context) => ({ 
                                type: 'SPEAK',
                                value: `Your first question is: ${context.question9} The possible answers are: 1. ${context.incorrAnswerTwo9}, 2. ${context.incorrAnswerOne9}, 3. ${context.corrAnswer9}, 4. ${context.incorrAnswerThree9}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt2: {
                            entry: send((context) => ({ 
                                type: 'SPEAK', 
                                value: `${context.question9} The possible answers are: 1. ${context.incorrAnswerTwo9}, 2. ${context.incorrAnswerOne9}, 3. ${context.corrAnswer9}, 4. ${context.incorrAnswerThree9}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt3: {
                            entry: send((context) => ({ 
                                type: 'SPEAK', 
                                value: `This is your last chance to answer this question: ${context.question9} The possible answers are: 1. ${context.incorrAnswerTwo9}, 2. ${context.incorrAnswerOne9}, 3. ${context.corrAnswer9}, 4. ${context.incorrAnswerThree9}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I did not get that."),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.ninthQuestion' }  
                        },
                        // check if sure
                        checkTrue: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'goodJob',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}), 
                                        actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$150000' }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.ninthQuestion', 
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?` 
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        checkFalse: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'youFailed',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => 0 }),
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.ninthQuestion', 
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        // lifelines
                        // 50/50
                        fiftyFifty: {
                            initial: 'select',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '.checkTrue',  
                                        cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                            context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "1" })
                                    },
                                    {
                                        target: '.checkFalse',  
                                        cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                            context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "2" })
                                    },
                                    {
                                        target: '.nomatch',
                                        actions: assign({ counter: (context) => context.counter + 1 })
                                    }
                                ],
                                TIMEOUT: { target: '.select', actions: assign({ counter: (context) => context.counter + 1 }) }
                            },
                            states: {
                                select: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.fiftyFiftyCounter !== 0 },
                                        { target: 'reducedQuestion1', cond: (context) => context.counter === 0 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion2', cond: (context) => context.counter === 1 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion3', cond: (context) => context.counter === 2 && context.fiftyFiftyCounter === 0 },
                                        { target: '#root.dm.playMillionaire.ninthQuestion.youFailed', cond: (context) => context.counter === 3 },  
                                    ]
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your fifty-fifty lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.ninthQuestion' 
                                    }
                                },
                                reducedQuestion1: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me take away two of the incorrect answers and re-read the question for you together with the remaining two options. ${context.question9}
                                                The remaining answers are: 1. ${context.corrAnswer9}, 2. ${context.incorrAnswerThree9}.`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion2: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `${context.question9} The remaining answers are: 1. ${context.corrAnswer9}, 2. ${context.incorrAnswerThree9}.`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion3: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `For the final time: ${context.question9}. The answers are: 1. ${context.corrAnswer9}, 2. ${context.incorrAnswerThree9}.`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'select' }
                                },
                                checkTrue: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.ninthQuestion.goodJob',  
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$150000' }), assign({ fiftyFiftyCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.ninthQuestion.fiftyFifty',  
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`  
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                                checkFalse: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.ninthQuestion.youFailed',  
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => 0 }),  
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.ninthQuestion.fiftyFifty',  
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`  
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                            },
                        },
                        // switchQuestion
                        switchQuestion: {
                            initial: 'choose',
                            states: {
                                choose: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.switchCounter !== 0 },
                                        { target: 'changeQuestion', cond: (context) => context.switchCounter === 0 },
                                    ]
                                },
                                changeQuestion: {
                                    entry: [send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me change your question to our backup question`
                                    })), assign({ extraQuestionMoney: (context) => "$150000" }), assign({ switchCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })],
                                    on: { ENDSPEECH: '#root.dm.playMillionaire.extraQuestion' }
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your switch question lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.ninthQuestion'  
                                    }
                                },
                            }
                        },
                        // final states
                        goodJob: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Correct! ${context.corrAnswer9} was the right answer. You just doubled your reward!` // change
                            })),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.chitChat' }
                        },
                        youFailed: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `I'm sorry, but the correct answer was ${context.corrAnswer9}. You will have to go home with ${context.safePoint}` // change
                            })),
                            on: { ENDSPEECH: '#root.dm.init' }
                        },
                    }
                },

                tenthQuestion: {   
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => context.recResult[0].utterance.indexOf("help") !== -1 || context.recResult[0].utterance.indexOf("Help") !== -1
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
                            },
                            {
                                target: '.choose',
                                cond: (context) => context.recResult[0].utterance.indexOf("repeat") !== -1 || context.recResult[0].utterance.indexOf("Repeat") !== -1
                            },
                            {
                                target: '.fiftyFifty',
                                cond: (context) => context.recResult[0].utterance.indexOf("fifty") !== -1 || context.recResult[0].utterance.indexOf("Fifty") !== -1 ||
                                    context.recResult[0].utterance.indexOf("50") !== -1 || context.recResult[0].utterance.indexOf("5050") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.switchQuestion',
                                cond: (context) => context.recResult[0].utterance.indexOf("switch") !== -1 || context.recResult[0].utterance.indexOf("Switch") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.checkFalse',  
                                cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                    context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "1" })
                            },
                            {
                                target: '.checkFalse',  
                                cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "2" })
                            },
                            {
                                target: '.checkFalse',  
                                cond: (context) => context.recResult[0].utterance.indexOf("third") !== -1 || context.recResult[0].utterance.indexOf("three") !== -1 || context.recResult[0].utterance.indexOf("3rd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("3") !== -1 || context.recResult[0].utterance.indexOf("Three") !== -1 || context.recResult[0].utterance.indexOf("Third") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "3" })]
                            },
                            {
                                target: '.checkTrue',  
                                cond: (context) => context.recResult[0].utterance.indexOf("fourth") !== -1 || context.recResult[0].utterance.indexOf("four") !== -1 || context.recResult[0].utterance.indexOf("4th") !== -1 ||
                                    context.recResult[0].utterance.indexOf("4") !== -1 || context.recResult[0].utterance.indexOf("Four") !== -1 || context.recResult[0].utterance.indexOf("Fourth") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "4" })]
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 })
                            },
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: 'youFailed', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: send((context) => ({  
                                type: 'SPEAK',  
                                value: `Your first question is: ${context.question10} The possible answers are: 1. ${context.incorrAnswerThree10}, 2. ${context.incorrAnswerOne10}, 3. ${context.incorrAnswerTwo10}, 4. ${context.corrAnswer10}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt2: {
                            entry: send((context) => ({  
                                type: 'SPEAK', 
                                value: `${context.question10} The possible answers are: 1. ${context.incorrAnswerThree10}, 2. ${context.incorrAnswerOne10}, 3. ${context.incorrAnswerTwo10}, 4. ${context.corrAnswer10}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt3: {
                            entry: send((context) => ({  
                                type: 'SPEAK',  
                                value: `This is your last chance to answer this question: ${context.question10} The possible answers are: 1. ${context.incorrAnswerThree10}, 2. ${context.incorrAnswerOne10}, 3. ${context.incorrAnswerTwo10}, 4. ${context.corrAnswer10}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I did not get that."),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.tenthQuestion' }  
                        },
                        // check if sure
                        checkTrue: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'goodJob',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),  
                                        actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$250000' }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.tenthQuestion',  
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        checkFalse: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'youFailed',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => 0 }),
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.tenthQuestion',  
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?` 
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        // lifelines
                        // 50/50
                        fiftyFifty: {
                            initial: 'select',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '.checkFalse',  
                                        cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                            context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "1" })
                                    },
                                    {
                                        target: '.checkTrue',  
                                        cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                            context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "2" })
                                    },
                                    {
                                        target: '.nomatch',
                                        actions: assign({ counter: (context) => context.counter + 1 })
                                    }
                                ],
                                TIMEOUT: { target: '.select', actions: assign({ counter: (context) => context.counter + 1 }) }
                            },
                            states: {
                                select: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.fiftyFiftyCounter !== 0 },
                                        { target: 'reducedQuestion1', cond: (context) => context.counter === 0 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion2', cond: (context) => context.counter === 1 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion3', cond: (context) => context.counter === 2 && context.fiftyFiftyCounter === 0 },
                                        { target: '#root.dm.playMillionaire.tenthQuestion.youFailed', cond: (context) => context.counter === 3 },  
                                    ]
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your fifty-fifty lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.tenthQuestion'  
                                    }
                                },
                                reducedQuestion1: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me take away two of the incorrect answers and re-read the question for you together with the remaining two options. ${context.question10}
                                                The remaining answers are: 1. ${context.incorrAnswerTwo10}, 2. ${context.corrAnswer10}.`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion2: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `${context.question10} The remaining answers are: 1. ${context.incorrAnswerTwo10}, 2. ${context.corrAnswer10}.` 
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion3: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `For the final time: ${context.question10}. The answers are: 1. ${context.incorrAnswerTwo10}, 2. ${context.corrAnswer10}.` 
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'select' }
                                },
                                checkTrue: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.tenthQuestion.goodJob',  
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$250000' }), assign({ fiftyFiftyCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.tenthQuestion.fiftyFifty',  
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`  
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                                checkFalse: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.tenthQuestion.youFailed',  
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => 0 }), 
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.tenthQuestion.fiftyFifty',  
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?` 
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                            },
                        },
                        // switchQuestion
                        switchQuestion: {
                            initial: 'choose',
                            states: {
                                choose: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.switchCounter !== 0 },
                                        { target: 'changeQuestion', cond: (context) => context.switchCounter === 0 },
                                    ]
                                },
                                changeQuestion: {
                                    entry: [send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me change your question to our backup question`
                                    })), assign({ extraQuestionMoney: (context) => "$250000" }), assign({ switchCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })],
                                    on: { ENDSPEECH: '#root.dm.playMillionaire.extraQuestion' }
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your switch question lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.firstQuestion'
                                    }
                                },
                            }
                        },
                        // final states
                        goodJob: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Correct! ${context.corrAnswer10} was the right answer. You're now at $250000!` 
                            })),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.chitChat' }
                        },
                        youFailed: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `I'm sorry, but the correct answer was ${context.corrAnswer10}. You will have to go home with ${context.safePoint}` 
                            })),
                            on: { ENDSPEECH: '#root.dm.init' }
                        },
                    }
                },

                eleventhQuestion: {  
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => context.recResult[0].utterance.indexOf("help") !== -1 || context.recResult[0].utterance.indexOf("Help") !== -1
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
                            },
                            {
                                target: '.choose',
                                cond: (context) => context.recResult[0].utterance.indexOf("repeat") !== -1 || context.recResult[0].utterance.indexOf("Repeat") !== -1
                            },
                            {
                                target: '.fiftyFifty',
                                cond: (context) => context.recResult[0].utterance.indexOf("fifty") !== -1 || context.recResult[0].utterance.indexOf("Fifty") !== -1 ||
                                    context.recResult[0].utterance.indexOf("50") !== -1 || context.recResult[0].utterance.indexOf("5050") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.switchQuestion',
                                cond: (context) => context.recResult[0].utterance.indexOf("switch") !== -1 || context.recResult[0].utterance.indexOf("Switch") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.checkTrue', 
                                cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                    context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "1" })
                            },
                            {
                                target: '.checkFalse', 
                                cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "2" })
                            },
                            {
                                target: '.checkFalse', 
                                cond: (context) => context.recResult[0].utterance.indexOf("third") !== -1 || context.recResult[0].utterance.indexOf("three") !== -1 || context.recResult[0].utterance.indexOf("3rd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("3") !== -1 || context.recResult[0].utterance.indexOf("Three") !== -1 || context.recResult[0].utterance.indexOf("Third") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "3" })]
                            },
                            {
                                target: '.checkFalse', 
                                cond: (context) => context.recResult[0].utterance.indexOf("fourth") !== -1 || context.recResult[0].utterance.indexOf("four") !== -1 || context.recResult[0].utterance.indexOf("4th") !== -1 ||
                                    context.recResult[0].utterance.indexOf("4") !== -1 || context.recResult[0].utterance.indexOf("Four") !== -1 || context.recResult[0].utterance.indexOf("Fourth") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "4" })]
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 })
                            },
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: 'youFailed', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: send((context) => ({ 
                                type: 'SPEAK', 
                                value: `Your first question is: ${context.question11} The possible answers are: 1. ${context.corrAnswer11}, 2. ${context.incorrAnswerOne11}, 3. ${context.incorrAnswerTwo11}, 4. ${context.incorrAnswerThree11}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt2: {
                            entry: send((context) => ({ 
                                type: 'SPEAK', 
                                value: `${context.question11} The possible answers are: 1. ${context.corrAnswer11}, 2. ${context.incorrAnswerOne11}, 3. ${context.incorrAnswerTwo11}, 4. ${context.incorrAnswerThree11}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt3: {
                            entry: send((context) => ({ 
                                type: 'SPEAK', 
                                value: `This is your last chance to answer this question: ${context.question11} The possible answers are: 1. ${context.corrAnswer11}, 2. ${context.incorrAnswerOne11}, 3. ${context.incorrAnswerTwo11}, 4. ${context.incorrAnswerThree11}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I did not get that."),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.eleventhQuestion' } 
                        },
                        // check if sure
                        checkTrue: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'goodJob',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}), 
                                        actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$500000' }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.eleventhQuestion', 
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?` 
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        checkFalse: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'youFailed',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => 0 }),
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.eleventhQuestion', 
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        // lifelines
                        // 50/50
                        fiftyFifty: {
                            initial: 'select',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '.checkTrue',  
                                        cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                            context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "1" })
                                    },
                                    {
                                        target: '.checkFalse',  
                                        cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                            context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "2" })
                                    },
                                    {
                                        target: '.nomatch',
                                        actions: assign({ counter: (context) => context.counter + 1 })
                                    }
                                ],
                                TIMEOUT: { target: '.select', actions: assign({ counter: (context) => context.counter + 1 }) }
                            },
                            states: {
                                select: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.fiftyFiftyCounter !== 0 },
                                        { target: 'reducedQuestion1', cond: (context) => context.counter === 0 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion2', cond: (context) => context.counter === 1 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion3', cond: (context) => context.counter === 2 && context.fiftyFiftyCounter === 0 },
                                        { target: '#root.dm.playMillionaire.eleventhQuestion.youFailed', cond: (context) => context.counter === 3 }, 
                                    ]
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your fifty-fifty lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.eleventhQuestion' 
                                    }
                                },
                                reducedQuestion1: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me take away two of the incorrect answers and re-read the question for you together with the remaining two options. ${context.question11}
                                                The remaining answers are: 1. ${context.corrAnswer11}, 2. ${context.incorrAnswerThree11}.` 
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion2: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `${context.question11} The remaining answers are: 1. ${context.corrAnswer11}, 2. ${context.incorrAnswerThree11}.`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion3: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `For the final time: ${context.question11}. The answers are: 1. ${context.corrAnswer11}, 2. ${context.incorrAnswerThree11}.`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'select' }
                                },
                                checkTrue: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.eleventhQuestion.goodJob',  
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$500000' }), assign({ fiftyFiftyCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.eleventhQuestion.fiftyFifty', 
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?` 
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                                checkFalse: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.eleventhQuestion.youFailed',  
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => 0 }),  
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.eleventhQuestion.fiftyFifty',  
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`  
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                            },
                        },
                        // switchQuestion
                        switchQuestion: {
                            initial: 'choose',
                            states: {
                                choose: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.switchCounter !== 0 },
                                        { target: 'changeQuestion', cond: (context) => context.switchCounter === 0 },
                                    ]
                                },
                                changeQuestion: {
                                    entry: [send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me change your question to our backup question`
                                    })), assign({ extraQuestionMoney: (context) => "$500000" }), assign({ switchCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })],
                                    on: { ENDSPEECH: '#root.dm.playMillionaire.extraQuestion' }
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your switch question lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.eleventhQuestion'  
                                    }
                                },
                            }
                        },
                        // final states
                        goodJob: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Correct! ${context.corrAnswer11} was the right answer. You are at $500000 and only one question away from winning!` 
                            })),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.chitChat' }
                        },
                        youFailed: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `I'm sorry, but the correct answer was ${context.corrAnswer11}. You will have to go home with ${context.safePoint}` 
                            })),
                            on: { ENDSPEECH: '#root.dm.init' }
                        },
                    }
                },

                twelfthQuestion: {  
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => context.recResult[0].utterance.indexOf("help") !== -1 || context.recResult[0].utterance.indexOf("Help") !== -1
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
                            },
                            {
                                target: '.choose',
                                cond: (context) => context.recResult[0].utterance.indexOf("repeat") !== -1 || context.recResult[0].utterance.indexOf("Repeat") !== -1
                            },
                            {
                                target: '.fiftyFifty',
                                cond: (context) => context.recResult[0].utterance.indexOf("fifty") !== -1 || context.recResult[0].utterance.indexOf("Fifty") !== -1 ||
                                    context.recResult[0].utterance.indexOf("50") !== -1 || context.recResult[0].utterance.indexOf("5050") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.switchQuestion',
                                cond: (context) => context.recResult[0].utterance.indexOf("switch") !== -1 || context.recResult[0].utterance.indexOf("Switch") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.checkFalse',  
                                cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                    context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "1" })
                            },
                            {
                                target: '.checkTrue',  
                                cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "2" })
                            },
                            {
                                target: '.checkFalse',  
                                cond: (context) => context.recResult[0].utterance.indexOf("third") !== -1 || context.recResult[0].utterance.indexOf("three") !== -1 || context.recResult[0].utterance.indexOf("3rd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("3") !== -1 || context.recResult[0].utterance.indexOf("Three") !== -1 || context.recResult[0].utterance.indexOf("Third") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "3" })]
                            },
                            {
                                target: '.checkFalse',  
                                cond: (context) => context.recResult[0].utterance.indexOf("fourth") !== -1 || context.recResult[0].utterance.indexOf("four") !== -1 || context.recResult[0].utterance.indexOf("4th") !== -1 ||
                                    context.recResult[0].utterance.indexOf("4") !== -1 || context.recResult[0].utterance.indexOf("Four") !== -1 || context.recResult[0].utterance.indexOf("Fourth") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "4" })]
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 })
                            },
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: 'youFailed', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: send((context) => ({ 
                                type: 'SPEAK', 
                                value: `Your first question is: ${context.question12} The possible answers are: 1. ${context.incorrAnswerOne12}, 2. ${context.corrAnswer12}, 3. ${context.incorrAnswerTwo12}, 4. ${context.incorrAnswerThree12}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt2: {
                            entry: send((context) => ({ 
                                type: 'SPEAK', 
                                value: `${context.question12} The possible answers are: 1. ${context.incorrAnswerOne12}, 2. ${context.corrAnswer12}, 3. ${context.incorrAnswerTwo12}, 4. ${context.incorrAnswerThree12}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt3: {
                            entry: send((context) => ({ 
                                type: 'SPEAK', 
                                value: `This is your last chance to answer this question: ${context.question12} The possible answers are:  1. ${context.incorrAnswerOne12}, 2. ${context.corrAnswer12}, 3. ${context.incorrAnswerTwo12}, 4. ${context.incorrAnswerThree12}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I did not get that."),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.twelfthQuestion' } 
                        },
                        // check if sure
                        checkTrue: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'goodJob',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}), // change
                                        actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$1000000' }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.twelfthQuestion', 
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?` 
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        checkFalse: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'youFailed',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => 0 }),
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.twelfthQuestion',  
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?`  
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        // lifelines
                        // 50/50
                        fiftyFifty: {
                            initial: 'select',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '.checkFalse', 
                                        cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                            context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "1" })
                                    },
                                    {
                                        target: '.checkTrue', 
                                        cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                            context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "2" })
                                    },
                                    {
                                        target: '.nomatch',
                                        actions: assign({ counter: (context) => context.counter + 1 })
                                    }
                                ],
                                TIMEOUT: { target: '.select', actions: assign({ counter: (context) => context.counter + 1 }) }
                            },
                            states: {
                                select: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.fiftyFiftyCounter !== 0 },
                                        { target: 'reducedQuestion1', cond: (context) => context.counter === 0 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion2', cond: (context) => context.counter === 1 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion3', cond: (context) => context.counter === 2 && context.fiftyFiftyCounter === 0 },
                                        { target: '#root.dm.playMillionaire.twelfthQuestion.youFailed', cond: (context) => context.counter === 3 }, 
                                    ]
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your fifty-fifty lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.twelfthQuestion' 
                                    }
                                },
                                reducedQuestion1: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me take away two of the incorrect answers and re-read the question for you together with the remaining two options. ${context.question12}
                                                The remaining answers are: 1. ${context.incorrAnswerOne12}, 2. ${context.corrAnswer12}.` // change
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion2: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `${context.question12} The remaining answers are: 1. ${context.incorrAnswerOne12}, 2. ${context.corrAnswer12}.` 
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion3: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `For the final time: ${context.question12}. The answers are: 1. ${context.incorrAnswerOne12}, 2. ${context.corrAnswer12}.` 
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'select' }
                                },
                                checkTrue: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.twelfthQuestion.goodJob', 
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => '$1000000' }), assign({ fiftyFiftyCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })], // add safe step whenever necessary
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.twelfthQuestion.fiftyFifty', 
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`  
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                                checkFalse: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.twelfthQuestion.youFailed',  
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => 0 }),  
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.twelfthQuestion.fiftyFifty', 
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`  
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                            },
                        },
                        // switchQuestion
                        switchQuestion: {
                            initial: 'choose',
                            states: {
                                choose: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.switchCounter !== 0 },
                                        { target: 'changeQuestion', cond: (context) => context.switchCounter === 0 },
                                    ]
                                },
                                changeQuestion: {
                                    entry: [send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me change your question to our backup question`
                                    })), assign({ extraQuestionMoney: (context) => "$1000000" }), assign({ switchCounter: (context) => 1 }), assign({ currentQuestion: (context) => context.currentQuestion + 1 }), assign({ remainingQuestions: (context) => context.remainingQuestions - 1 })],
                                    on: { ENDSPEECH: '#root.dm.playMillionaire.extraQuestion' }
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your switch question lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.twelfthQuestion' 
                                    }
                                },
                            }
                        },
                        // final states
                        goodJob: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Correct! ${context.corrAnswer12} was the right answer. Congratulations! This was your last question, which means you just won a million dollars! You are a millionaire!` 
                            })),
                            on: { ENDSPEECH: '#root.dm.init' }
                        },
                        youFailed: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `I'm sorry, but the correct answer was ${context.corrAnswer12}. You will have to go home with ${context.safePoint}` 
                            })),
                            on: { ENDSPEECH: '#root.dm.init' }
                        },
                    }
                },
                // extra question for change question lifeline
                extraQuestion: {
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => context.recResult[0].utterance.indexOf("help") !== -1 || context.recResult[0].utterance.indexOf("Help") !== -1
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
                            },
                            {
                                target: '.choose',
                                cond: (context) => context.recResult[0].utterance.indexOf("repeat") !== -1 || context.recResult[0].utterance.indexOf("Repeat") !== -1
                            },
                            {
                                target: '.fiftyFifty',
                                cond: (context) => context.recResult[0].utterance.indexOf("fifty") !== -1 || context.recResult[0].utterance.indexOf("Fifty") !== -1 ||
                                    context.recResult[0].utterance.indexOf("50") !== -1 || context.recResult[0].utterance.indexOf("5050") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.switchQuestion',
                                cond: (context) => context.recResult[0].utterance.indexOf("switch") !== -1 || context.recResult[0].utterance.indexOf("Switch") !== -1,
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.checkTrue',
                                cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                    context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "1" })
                            },
                            {
                                target: '.checkFalse',
                                cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                actions: assign({ uncertainAnswer: (context) => "2" })
                            },
                            {
                                target: '.checkFalse',
                                cond: (context) => context.recResult[0].utterance.indexOf("third") !== -1 || context.recResult[0].utterance.indexOf("three") !== -1 || context.recResult[0].utterance.indexOf("3rd") !== -1 ||
                                    context.recResult[0].utterance.indexOf("3") !== -1 || context.recResult[0].utterance.indexOf("Three") !== -1 || context.recResult[0].utterance.indexOf("Third") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "3" })]
                            },
                            {
                                target: '.checkFalse',
                                cond: (context) => context.recResult[0].utterance.indexOf("fourth") !== -1 || context.recResult[0].utterance.indexOf("four") !== -1 || context.recResult[0].utterance.indexOf("4th") !== -1 ||
                                    context.recResult[0].utterance.indexOf("4") !== -1 || context.recResult[0].utterance.indexOf("Four") !== -1 || context.recResult[0].utterance.indexOf("Fourth") !== -1,
                                actions: [assign({ counter: (context) => 0 }), assign({ uncertainAnswer: (context) => "4" })]
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 })
                            },
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: 'youFailed', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: send((context) => ({
                                type: 'SPEAK', // corr answer A
                                value: `The extra question is: ${context.question13} The possible answers are: 1. ${context.corrAnswer13}, 2. ${context.incorrAnswerOne13}, 3. ${context.incorrAnswerTwo13}, 4. ${context.incorrAnswerThree13}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt2: {
                            entry: send((context) => ({
                                type: 'SPEAK', // corr answer A
                                value: `${context.question13} The possible answers are: 1. ${context.corrAnswer13}, 2. ${context.incorrAnswerOne13}, 3. ${context.incorrAnswerTwo13}, 4. ${context.incorrAnswerThree13}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt3: {
                            entry: send((context) => ({
                                type: 'SPEAK', // corr answer A
                                value: `This is your last chance to answer this question: ${context.question13} The possible answers are: 1. ${context.corrAnswer13}, 2. ${context.incorrAnswerOne13}, 3. ${context.incorrAnswerTwo13}, 4. ${context.incorrAnswerThree13}.`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I did not get that."),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.extraQuestion' }
                        },
                        // check if sure
                        checkTrue: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'goodJob',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => context.extraQuestionMoney })], // add safe step whenever necessary
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.extraQuestion',
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        checkFalse: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: 'youFailed',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => 0 }), // add safe step whenever necessary
                                    },
                                    {
                                        target: '#root.dm.playMillionaire.extraQuestion',
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: assign({ counter: (context) => context.counter + 1 }),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Is ${context.uncertainAnswer} your final answer?`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        },
                        // lifelines
                        // 50/50
                        fiftyFifty: {
                            initial: 'select',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '.checkTrue',
                                        cond: (context) => context.recResult[0].utterance.indexOf("first") !== -1 || context.recResult[0].utterance.indexOf("one") !== -1 || context.recResult[0].utterance.indexOf("1st") !== -1 ||
                                            context.recResult[0].utterance.indexOf("1") !== -1 || context.recResult[0].utterance.indexOf("One") !== -1 || context.recResult[0].utterance.indexOf("First") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "1" })
                                    },
                                    {
                                        target: '.checkFalse',
                                        cond: (context) => context.recResult[0].utterance.indexOf("second") !== -1 || context.recResult[0].utterance.indexOf("two") !== -1 || context.recResult[0].utterance.indexOf("2nd") !== -1 ||
                                            context.recResult[0].utterance.indexOf("2") !== -1 || context.recResult[0].utterance.indexOf("Two") !== -1 || context.recResult[0].utterance.indexOf("Second") !== -1,
                                        actions: assign({ uncertainAnswer: (context) => "2" })
                                    },
                                    {
                                        target: '.nomatch',
                                        actions: assign({ counter: (context) => context.counter + 1 })
                                    }
                                ],
                                TIMEOUT: { target: '.select', actions: assign({ counter: (context) => context.counter + 1 }) }
                            },
                            states: {
                                select: {
                                    always: [
                                        { target: 'goBack', cond: (context) => context.fiftyFiftyCounter !== 0 },
                                        { target: 'reducedQuestion1', cond: (context) => context.counter === 0 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion2', cond: (context) => context.counter === 1 && context.fiftyFiftyCounter === 0 },
                                        { target: 'reducedQuestion3', cond: (context) => context.counter === 2 && context.fiftyFiftyCounter === 0 },
                                        { target: '#root.dm.playMillionaire.extraQuestion.youFailed', cond: (context) => context.counter === 3 },
                                    ]
                                },
                                goBack: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `I am sorry, but you have already used up your fifty-fifty lifeline.`
                                    })),
                                    on: {
                                        ENDSPEECH: '#root.dm.playMillionaire.extraQuestion'
                                    }
                                },
                                reducedQuestion1: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Okay, let me take away two of the incorrect answers and re-read the question for you together with the remaining two options. ${context.question13}
                                                The remaining answers are: 1. ${context.corrAnswer13}, 2. ${context.incorrAnswerOne13}.`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion2: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `${context.question13} The remaining answers are: 1. ${context.corrAnswer13}, 2. ${context.incorrAnswerOne13}.`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                reducedQuestion3: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `For the final time: ${context.question13}. The answers are: 1. ${context.corrAnswer13}, 2. ${context.incorrAnswerOne13}.`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'select' }
                                },
                                checkTrue: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.extraQuestion.goodJob',
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: [assign({ counter: (context) => 0 }), assign({ currentMoney: (context) => context.extraQuestionMoney }), assign({ fiftyFiftyCounter: (context) => 1 })], // add safe step whenever necessary
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.extraQuestion.fiftyFifty',
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                                checkFalse: {
                                    initial: 'makeSure',
                                    on: {
                                        RECOGNISED: [
                                            {
                                                target: '#root.dm.playMillionaire.extraQuestion.youFailed',
                                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => 0 }), // add safe step whenever necessary
                                            },
                                            {
                                                target: '#root.dm.playMillionaire.extraQuestion.fiftyFifty',
                                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                                actions: assign({ counter: (context) => context.counter + 1 }),
                                            },
                                            {
                                                target: '.nomatch',
                                            }
                                        ],
                                        TIMEOUT: { target: '.makeSure' }
                                    },
                                    states: {
                                        makeSure: {
                                            entry: send((context) => ({
                                                type: 'SPEAK',
                                                value: `Is ${context.uncertainAnswer} your final answer?`
                                            })),
                                            on: {
                                                ENDSPEECH: 'ask'
                                            }
                                        },
                                        ask: {
                                            entry: send('LISTEN'),
                                        },
                                        nomatch: {
                                            entry: say("Sorry, I did not get that."),
                                            on: { ENDSPEECH: 'makeSure' }
                                        },

                                    },
                                },
                            },
                        },
                        // switchQuestion
                        switchQuestion: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `This question was already switched!.`
                            })),
                            on: {
                                ENDSPEECH: '#root.dm.playMillionaire.extraQuestion'
                            }
                        },
                        // final states
                        goodJob: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Correct! ${context.corrAnswer13} was the right answer. You just earned ${context.extraQuestionMoney}!`
                            })),
                            on: { ENDSPEECH: 'checkSafePoint' } // NEED TO MAKE A STATE TO DECIDE WHERE TO GO NEXT
                        },
                        youFailed: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `I'm sorry, but the correct answer was ${context.corrAnswer13}. You will have to go home with ${context.safePoint}`
                            })),
                            on: { ENDSPEECH: '#root.dm.init' }
                        },
                        checkSafePoint: {
                            always: [
                                { target: '#root.dm.playMillionaire.chitChat', cond: (context) => context.extraQuestionMoney === '$1000' || context.extraQuestionMoney === '$50000', actions: assign({ safePoint: (context) => context.extraQuestionMoney }) },
                                { target: '#root.dm.playMillionaire.chitChat', cond: (context) => context.extraQuestionMoney !== '$1000' },
                                { target: '#root.dm.playMillionaire.chitChat', cond: (context) => context.extraQuestionMoney !== '$50000' }
                            ]
                        }
                    }
                },

                chitChat: {
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => context.recResult[0].utterance.indexOf("help") !== -1 || context.recResult[0].utterance.indexOf("Help") !== -1
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.recResult[0].utterance.indexOf("quit") !== -1 || context.recResult[0].utterance.indexOf("Quit") !== -1
                            },
                            {
                                target: '.choose',
                                cond: (context) => context.recResult[0].utterance.indexOf("repeat") !== -1 || context.recResult[0].utterance.indexOf("Repeat") !== -1
                            },
                            {
                                target: '.leave',
                                cond: (context) => context.recResult[0].utterance.indexOf("leave") !== -1 || context.recResult[0].utterance.indexOf("Leave") !== -1
                            },
                            {
                                target: '.checkMoney',
                                cond: (context) => context.recResult[0].utterance.indexOf("money") !== -1 || context.recResult[0].utterance.indexOf("Money") !== -1
                            },
                            {
                                target: '.checkQuestions',
                                cond: (context) => context.recResult[0].utterance.indexOf("questions") !== -1 || context.recResult[0].utterance.indexOf("Questions") !== -1
                            },
                            {
                                target: '.selectNext',
                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '.negation',
                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                actions: assign({ counter: (context) => context.counter + 1 }),
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 })
                            },
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: '#root.dm.init', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Okay, that was question ${context.currentQuestion}. Are you ready to continue?`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt2: {
                            entry: send((context) => ({
                                type: 'SPEAK', 
                                value: `Are you ready to move on to the next question?`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt3: {
                            entry: send((context) => ({
                                type: 'SPEAK', 
                                value: `Shall we move on to the next question?`
                            })),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I did not get that."),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.chitChat' }
                        },
                        leave: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Okay! Thank you for playing, and you will now leave with ${context.currentMoney}`
                            })),
                            on: { ENDSPEECH: '#root.dm.init' }
                        },
                        checkMoney: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Let me have a look: your current potential winnings are ${context.currentMoney}, and your safety spot lies at ${context.safePoint}`
                            })),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.chitChat' }
                        },
                        checkQuestions: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Let me have a look. You just answered ${context.currentQuestion}, so you still have ${context.remainingQuestions} left to answer!`
                            })),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.chitChat' }
                        },
                        negation: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `I am sorry, but you must proceed or decide to leave now!`
                            })),
                            on: { ENDSPEECH: '#root.dm.playMillionaire.chitChat' }
                        },
                        selectNext: {
                            always: [
                                { target: '#root.dm.playMillionaire.secondQuestion', cond: (context) => context.currentQuestion === 1 },
                                { target: '#root.dm.playMillionaire.thirdQuestion', cond: (context) => context.currentQuestion === 2 },
                                { target: '#root.dm.playMillionaire.fourthQuestion', cond: (context) => context.currentQuestion === 3 },
                                { target: '#root.dm.playMillionaire.fifthQuestion', cond: (context) => context.currentQuestion === 4 },
                                { target: '#root.dm.playMillionaire.sixthQuestion', cond: (context) => context.currentQuestion === 5 },
                                { target: '#root.dm.playMillionaire.seventhQuestion', cond: (context) => context.currentQuestion === 6 },
                                { target: '#root.dm.playMillionaire.eighthQuestion', cond: (context) => context.currentQuestion === 7 },
                                { target: '#root.dm.playMillionaire.ninthQuestion', cond: (context) => context.currentQuestion === 8 },
                                { target: '#root.dm.playMillionaire.tenthQuestion', cond: (context) => context.currentQuestion === 9 },
                                { target: '#root.dm.playMillionaire.eleventhQuestion', cond: (context) => context.currentQuestion === 10 },
                                { target: '#root.dm.playMillionaire.twelfthQuestion', cond: (context) => context.currentQuestion === 11 },
                            ]
                        }
                    }
                },
            }
        },
    }
})


