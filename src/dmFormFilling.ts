import { MachineConfig, send, Action, assign } from "xstate";


function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}

const ans_grammar: { [index: string]: { confirmation?: string, negation?: string } } = {

    "Yes.": { confirmation: "Yes" },
    "Yeah.": { confirmation: "Yes" },
    "Of course.": { confirmation: "Yes" },
    "Exactly.": { confirmation: "Yes" },
    "Yeah, exactly.": { confirmation: "Yes" },
    "No.": { negation: "No" },
    "Nope.": { negation: "No" },
    "No way.": { negation: "No" },
    "Not what I said.": { negation: "No" }
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
                entry: { actions: [assign({ partnerCounter: (context) => 0 }), assign({ dayCounter: (context) => 0 }), assign({ timeCounter: (context) => 0 })] },
                ENDSPEECH: 'question'
            }
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
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Bob") !== -1, actions: [assign({ partnerCounter: (context) => 1 }), assign({ partner: (context) => "Bob" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Bob") === -1, target: 'done' },
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
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Friday") !== -1, actions: [assign({ dayCounter: (context) => 1 }), assign({ day: (context) => "Friday" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("Friday") === -1, target: 'done' },
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
                                        { cond: (context) => context.recResult[0].utterance.indexOf("noon") !== -1 || context.recResult[0].utterance.indexOf("Noon") !== -1, actions: [assign({ timeCounter: (context) => 1 }), assign({ time: (context) => "noon" })], target: 'done' },
                                        { cond: (context) => context.recResult[0].utterance.indexOf("noon") === -1 || context.recResult[0].utterance.indexOf("Noon") !== -1, target: 'done' },
                                    ]
                                },
                                done: {
                                    type: 'final',
                                }
                            }
                        },
                    },
                    onDone: { target: "#root.dm.question" }
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
            on: { ENDSPEECH: 'init' }
        }
    }
})


