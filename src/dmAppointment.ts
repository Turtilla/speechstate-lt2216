import { MachineConfig, send, Action, assign } from "xstate";


function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}

const kbRequest = (text: string) =>
    fetch(new Request(`https://cors.eu.org/https://api.duckduckgo.com/?q=${text}&format=json&skip_disambig=1`)).then(data => data.json())

const grammar: { [index: string]: { title?: string, day?: string, time?: string } } = {
    "Lecture.": { title: "Dialogue systems lecture" },
    "Lunch.": { title: "Lunch at the canteen" },
    "Cinema.": { title: "A movie at the cinema" },
    "Walk.": { title: "A walk in the park" },
    "Date.": { title: "A romantic date at your favorite restaurant" },
    "Language course.": { title: "Swedish language course on zoom" },
    "Programming.": { title: "Programming the assignment with classmates" },
    "Video games.": { title: "Gaming with friends" },
    "Phone call.": { title: "A call with your family" },

    "On Monday.": { day: "Monday" },
    "On Tuesday.": { day: "Tuesday" },
    "On Wednesday.": { day: "Wednesday" },
    "On Thursday.": { day: "Thursday" },
    "On Friday.": { day: "Friday" },
    "On Saturday.": { day: "Saturday" },
    "On Sunday.": { day: "Sunday" },
    "Monday.": { day: "Monday" },
    "Tuesday.": { day: "Tuesday" },
    "Wednesday.": { day: "Wednesday" },
    "Thursday.": { day: "Thursday" },
    "Friday.": { day: "Friday" },
    "Saturday.": { day: "Saturday" },
    "Sunday.": { day: "Sunday" },
    "Today": { day: "today" },
    "Tomorrow.": { day: "tomorrow" },

    "10.": { time: "10:00" },
    "11.": { time: "11:00" },
    "12.": { time: "12:00" },
    "Midday.": { time: "12:00" },
    "At noon": { time: "12:00" },
    "1.": { time: "1:00" },
    "2.": { time: "2:00" },
    "3.": { time: "3:00" },
    "4.": { time: "4:00" },
    "5.": { time: "5:00" },
    "6.": { time: "6:00" },
    "7.": { time: "7:00" },
    "8.": { time: "8:00" },
    "9.": { time: "9:00" },
    "At 10:00": { time: "10:00" },
    "At 11:00": { time: "11:00" },
    "At 12:00": { time: "12:00" },
    "At 1:00": { time: "1:00" },
    "At 2:00": { time: "2:00" },
    "At 3:00": { time: "3:00" },
    "At 4:00": { time: "4:00" },
    "At 5:00": { time: "5:00" },
    "At 6:00": { time: "6:00" },
    "At 7:00": { time: "7:00" },
    "At 8:00": { time: "8:00" },
    "At 9:00": { time: "9:00" },
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

const dec_grammar: { [index: string]: { meeting?: string, celebrity?: string } } = {

    "I want to create a meeting.": { meeting: "Yes" },
    "A meeting.": { meeting: "Yes" },
    "I want a meeting.": { meeting: "Yes" },
    "Meeting.": { meeting: "Yes" },
    "I want to ask about somebody.": { celebrity: "Yes" },
    "I want to ask about someone.": { celebrity: "Yes" },
    "Ask about somebody.": { celebrity: "Yes" },
    "Ask about someone.": { celebrity: "Yes" },
    "I want to ask.": { celebrity: "Yes" },
    "Somebody.": { celebrity: "Yes" },
    "Someone.": { celebrity: "Yes" },
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
                TTS_READY: 'welcome',
                CLICK: 'welcome'
            }
        },
        welcome: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'purpose',
                        cond: (context) => "meeting" in (dec_grammar[context.recResult[0].utterance] || {}),
                    },
                    {
                        target: 'celebrity',
                        cond: (context) => "celebrity" in (dec_grammar[context.recResult[0].utterance] || {}),
                        actions: assign({ celebrity: (context) => dec_grammar[context.recResult[0].utterance].celebrity! })
                    },
                    {
                        target: '.nomatch'
                    }
                ],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: say("Do you want to create a meeting or ask about somebody?"),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I didn't understand that. Can you repeat?"),
                    on: { ENDSPEECH: 'ask' }
                }
            }
        },
        celebrity: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'getCeleb',
                        actions: assign({ person: (context) => context.recResult[0].utterance })
                    },
                ],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: say("Who do you want to know about?"),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I didn't understand that. Can you repeat?."),
                    on: { ENDSPEECH: 'ask' }
                }
            }
        },
        getCeleb: {
            invoke: {
                id: 'getInfo',
                src: (context, event) => kbRequest(context.person),
                onDone: {
                    target: 'celebMeeting',
                    actions: [
                        assign({ info: (context, event) => event.data.AbstractText }),
                        (context, event) => console.log(context, event)
                        ]
                },
                onError: {
                    target: 'celebrity'
                }
            }
        },
        celebMeeting: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'date',
                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {})
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
                        value: `${context.info}`
                    })),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I didn't get it. Can you please repeat."),
                    on: { ENDSPEECH: 'ask' }
                }
            }
        },
        purpose: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'info',
                        cond: (context) => "title" in (grammar[context.recResult[0].utterance] || {}),
                        actions: assign({ title: (context) => grammar[context.recResult[0].utterance].title! })
                    },
                    {
                        target: '.nomatch'
                    }
                ],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: say("What is it about?"),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I don't know what it is. Tell me something I know."),
                    on: { ENDSPEECH: 'ask' }
                }
            }
        },
        info: {
            entry: send((context) => ({
                type: 'SPEAK',
                value: `OK, ${context.title}`
            })),
            on: { ENDSPEECH: 'date' }
        },
        date: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'info2',
                        cond: (context) => "day" in (grammar[context.recResult[0].utterance] || {}),
                        actions: assign({ day: (context) => grammar[context.recResult[0].utterance].day! })
                    },
                    {
                        target: '.nomatch'
                    }
                ],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: say("On which day is it?"),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I don't know what day it is. Could you repeat?"),
                    on: { ENDSPEECH: 'ask' }
                }
            }
        },
        time: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'confirmtime',
                        cond: (context) => "time" in (grammar[context.recResult[0].utterance] || {}),
                        actions: assign({ time: (context) => grammar[context.recResult[0].utterance].time! })
                    },
                    {
                        target: '.nomatch'
                    }
                ],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: say("What time is your meeting?"),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I didn't hear what time it was supposed to be. Could you repeat?"),
                    on: { ENDSPEECH: 'ask' }
                }
            }
        },
        info2: {
            entry: send((context) => ({
                type: 'SPEAK',
                value: `OK, ${context.day}`
            })),
            on: { ENDSPEECH: 'allday' }
        },
        allday: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'confirmallday',
                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                    },
                    {
                        target: 'time',
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
                    entry: say("Will it take the whole day?"),
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
        confirmallday: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'success',
                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                    },
                    {
                        target: 'welcome',
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
                        value: `Do you want me to create a meeting titled ${context.title} for ${context.day} for the whole day?`
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
        confirmtime: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'success',
                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                    },
                    {
                        target: 'welcome',
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
                        value: `Do you want me to create a meeting titled ${context.title} for ${context.day} at ${context.time}?`
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
            entry: say(`Your meeting has been created`),
            on: { ENDSPEECH: 'init' }  
        }
    }
})


