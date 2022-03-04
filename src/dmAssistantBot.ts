import { getCipherInfo } from "crypto";
import { MachineConfig, send, Action, assign } from "xstate";


function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}

const rasaurl = 'https://dialogue-systems.herokuapp.com/model/parse'
const nluRequest = (text: string) =>
    fetch(new Request(rasaurl, {
        method: 'POST',
        body: `{"text": "${text}"}`
    }))
        .then(data => data.json());

const grammar: { [index: string]: { intent?: string } } = {
    "vacuum": { intent: "vacuum" },
    "move_to_trash": { intent: "move this to trash" },
    "give": { intent: "give this to you" },
    "turn_on_light": { intent: "turn the lights on" },
    "turn_off_light": { intent: "turn the lights off" },
    "do_dishes": { intent: "do the dishes" },
    "ask_oven_warm": { intent: "check if the oven is warm" },
    "inform_oven_warm": { intent: "remember that the oven is warm" },
}

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
    entry: assign({ counter: (context) => 0 }),
    states: {
        idle: {
            on: {
                CLICK: 'init'
            }
        },

        init: {
            on: {
                TTS_READY: 'botApp',
                CLICK: 'botApp',
            }
        },

        getHelp: {
            initial: 'explain',
            states: {
                explain: {
                    entry: say(`Please make sure to speak slowly and clearly so that the I understands you.`),
                    on: { ENDSPEECH: '#root.dm.botApp.hist' },
                }
            }
        },

        botApp: {
            initial: 'askForName',
            states: {
                hist: {
                    type: 'history',
                },
                askForName: {
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {}),
                            },
                            {
                                target: 'greet',
                                actions: [assign({ username: (context) => context.recResult[0].utterance }), assign({ counter: (context) => 0 })]
                            }
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
                            entry: say("What's your name?"),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt2: {
                            entry: say("What should I call you?"),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt3: {
                            entry: say("Please tell me your name."),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                    }
                },

                greet: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `Hi, ${context.username}.`
                    })),
                    on: { ENDSPEECH: 'purpose' }
                },

                purpose: {
                    initial: 'choose',
                    on: {
                        RECOGNISED: { actions: assign({ counter: (context) => 0 }), target: 'getIntent' },
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
                            entry: say("What would you like me to do?"),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: say("What do you want me to do?"),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt3: {
                            entry: say("Please tell me what task you want me to carry out."),
                            on: { ENDSPEECH: 'ask' }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I don't know what it is. Tell me something I know."),
                            on: { ENDSPEECH: 'choose' }
                        }
                    }
                },

                getIntent: {
                    invoke: {
                        id: 'identifyIntent',
                        src: (context, event) => nluRequest(context.recResult[0].utterance),
                        onDone: {
                            target: 'confirmAction',
                            actions: [(context, event) => console.log(context, event), assign({ intent: (context, event) => event.data.intent.name }), assign({ title: (context) => grammar[context.intent].intent! })]
                        },
                        onError: {
                            target: 'purpose'
						}

					}
                },

                confirmAction: {
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: 'success',
                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: 'purpose',
                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {}),
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 }),
                            }
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
                                value: `${context.username}, do you want me to ${context.title}`
                            })),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Dear ${context.username}, should I ${context.title}?`
                            })),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt3: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `${context.username}, shall I ${context.title} for you?`
                            })),
                            on: { ENDSPEECH: 'ask' }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I didn't get it."),
                            on: { ENDSPEECH: 'choose' }
                        }
                    }
                },

                success: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `On my way to ${context.title}!`
                    })),
                    on: { ENDSPEECH: '#root.dm.init' }
                },
            }
        },
    }
})


