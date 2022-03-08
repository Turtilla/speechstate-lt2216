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
    "Yes, I would like that.": { confirmation: "Yes" },
    "Yes, I'd like that.": { confirmation: "Yes" },
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

        // Initially I had more here, with asking for the username etc., but since it is not the focus of this assignment I removed it for simplicity's sake - the same goes for other functionalities from dmAppointmentPlus.ts, such
        // as the confidence threshold or asking for help.

        greet: {
            entry: send((context) => ({
                type: 'SPEAK',
                value: `Welcome.`
            })),
            on: {
                entry: { actions: [assign({ partnerCounter: (context) => 0 }), assign({ dayCounter: (context) => 0 }), assign({ timeCounter: (context) => 0 })] },  // sets counters to 0
                ENDSPEECH: 'question'
            }
        },

        // Within this state you can find the whole form-filling behavior. Initially the state goes into a substate 'choose' where a suitable prompt is selected based on the information that the system has elicited from the
        // user - so at the start it will always be 'prompt1'. This info is stored in context variables partner, day, and time, and whether that info has been stored is recorded in respective counters (whenever it is stored, the
        // counter is set to 1). After the prompt is read out, the system listens for an answer moving to the parallel state 'formToFill', where simultaneously three substates exist and check for specific conditions. There is
        // a number of conditions corresponding to different names, days, and times, and always one for when such information is not in the utterance. If it is, it gets stored in an appropriate variable and the counter is set to
        // 1, and the substate goes to its final state. If there is no match, it just goes to final. Once all reach the final state, 'onDone' kicks in and moves us to the start of the state again, where the conditions for a
        // different prompt are verified - so potentially a different and more specific question is asked. If all the slots/variables are filled, we move to the 'confirmTime' state, where the system repeats all that information
        // and asks for a confirmation. Saying no resets it to point 0, saying yes finishes its work (and also resets the variables). 

        // There are some issues here - for some reason the system does not recognize 'three' and 'At three' as fulfilling the conditions, while it does so with other times - but these are, I think, some voice recognition 
        // peculiarities that I also noticed in the other assignments. Additionally, we can always override what we said before (if in the first sentence we omit the day but give a person and time, we can in the next one give a
        // day and time and the latter time will be selected). I also wish I found an easier way to deal with multiple options (I was thinking of some sort of iterating over a list or a set), but this one works and does not look
        // super complicated, it's just tougher to add a new entry than it would be with a simple list.

        // I also believe that identifying the entities in these utterances could have been done with a well-trained RASA model, but I did not want to use it since mine is already trained for the dmAssistantBot.ts, and since this
        // here seemed like a simpler solution for the time being, as I would need a ton of data to train RASA on to make it work this good, I think - a lot of different formulations that suggest that we are talking about a person,
        // a day, or a time. It would of course, in the end, be more versatile, but I think getting it to work like that would have been beyond the scope of this assignment. This is why I decided to simply check for the presence
        // of some specific substrings in the recognized utterances, and it works surprisingly well. Orthogonal states allow for the recognition of multiple elements at once, although I presume it could also have been done without
        // those, just checking one after another, after another and storing the information either way - but this is a good exercise to understand how parallel states work. I hope this is enough of a comment on my design choices.

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


