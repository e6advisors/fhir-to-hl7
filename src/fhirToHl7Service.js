/**
 * FHIR to HL7 Conversion Service
 * 
 * This service converts FHIR-compliant resources into HL7 v2.x messages.
 * 
 * Supported FHIR Resources:
 * - Patient (converted to PID segment)
 * - Encounter (converted to PV1 segment)
 * - RelatedPerson (converted to NK1 segment)
 * - Observation (converted to OBX segment)
 * - AllergyIntolerance (converted to AL1 segment)
 * - Condition (converted to DG1 segment)
 * 
 * HL7 Message types created:
 * - ADT^A01 (Patient Admit) - when Patient and Encounter with status 'in-progress' or 'planned'
 * - ADT^A08 (Patient Update) - when only Patient is present or Encounter status is 'finished'
 * - ADT^A04 (Patient Register) - when Encounter status is 'planned'
 * - ADT^A03 (Patient Discharge) - when Encounter status is 'finished' or 'cancelled'
 */

/**
 * Converts FHIR dateTime to HL7 date/time format
 * @param {string} fhirDateTime - FHIR dateTime string (YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD)
 * @returns {string} HL7 date/time string (YYYYMMDDHHMMSS or YYYYMMDD)
 */
function convertFHIRDateTimeToHL7(fhirDateTime) {
  if (!fhirDateTime || fhirDateTime.trim() === '') return ''
  
  // Remove timezone and time if present
  const cleaned = fhirDateTime.trim().split('T')[0]
  
  // FHIR format: YYYY-MM-DD
  const parts = cleaned.split('-')
  if (parts.length >= 3) {
    const year = parts[0] || ''
    const month = parts[1] || '01'
    const day = parts[2] || '01'
    
    let hl7Date = `${year}${month}${day}`
    
    // Add time if present in original
    if (fhirDateTime.includes('T')) {
      const timePart = fhirDateTime.split('T')[1]
      if (timePart) {
        const timeMatch = timePart.match(/(\d{2}):(\d{2}):(\d{2})/)
        if (timeMatch) {
          hl7Date += `${timeMatch[1]}${timeMatch[2]}${timeMatch[3]}`
        }
      }
    }
    
    return hl7Date
  }
  
  return ''
}

/**
 * Converts FHIR HumanName to HL7 name format
 * @param {Object} humanName - FHIR HumanName object
 * @returns {string} HL7 name string (Family^Given^Middle^Suffix^Prefix^Degree)
 */
function convertFHIRNameToHL7(humanName) {
  if (!humanName) return ''
  
  const parts = []
  
  // Family name
  parts.push(humanName.family || '')
  
  // Given names - separate first and middle if multiple
  const givenNames = humanName.given || []
  if (givenNames.length > 0) {
    parts.push(givenNames[0] || '') // First given name
    parts.push(givenNames.length > 1 ? givenNames.slice(1).join(' ') : '') // Middle names
  } else {
    parts.push('')
    parts.push('')
  }
  
  // Suffix
  const suffix = humanName.suffix && humanName.suffix.length > 0 ? humanName.suffix[0] : ''
  parts.push(suffix)
  
  // Prefix
  const prefix = humanName.prefix && humanName.prefix.length > 0 ? humanName.prefix[0] : ''
  parts.push(prefix)
  
  // Degree
  parts.push('')
  
  return parts.join('^')
}

/**
 * Converts FHIR Address to HL7 address format
 * @param {Object} address - FHIR Address object
 * @returns {string} HL7 address string (Street^City^State^Zip^Country)
 */
function convertFHIRAddressToHL7(address) {
  if (!address) return ''
  
  const parts = []
  
  // Street address (combine all lines)
  const lines = address.line || []
  parts.push(lines.join(' ') || '')
  
  // City
  parts.push(address.city || '')
  
  // State
  parts.push(address.state || '')
  
  // Postal code
  parts.push(address.postalCode || '')
  
  // Country
  parts.push(address.country || '')
  
  return parts.join('^')
}

/**
 * Converts FHIR gender to HL7 administrative sex
 * @param {string} gender - FHIR gender code (male, female, other, unknown)
 * @returns {string} HL7 administrative sex code (M, F, O, U)
 */
function convertFHIRGenderToHL7(gender) {
  if (!gender) return 'U'
  
  const mapping = {
    'male': 'M',
    'female': 'F',
    'other': 'O',
    'unknown': 'U',
  }
  
  return mapping[gender.toLowerCase()] || 'U'
}

/**
 * Converts FHIR marital status to HL7 code
 * @param {Object} maritalStatus - FHIR CodeableConcept
 * @returns {string} HL7 marital status code
 */
function convertFHIRMaritalStatusToHL7(maritalStatus) {
  if (!maritalStatus || !maritalStatus.coding) return ''
  
  // Common FHIR to HL7 marital status mappings
  const mapping = {
    'A': 'A', // Annulled
    'D': 'D', // Divorced
    'I': 'I', // Interlocutory
    'L': 'L', // Legally Separated
    'M': 'M', // Married
    'P': 'P', // Polygamous
    'S': 'S', // Never Married
    'T': 'T', // Domestic partner
    'W': 'W', // Widowed
    'UNK': 'U', // Unknown
  }
  
  const code = maritalStatus.coding[0]?.code
  return mapping[code] || code || ''
}

/**
 * Converts FHIR race/ethnicity extension to HL7 code
 * @param {Array} extensions - FHIR extensions array
 * @param {string} url - Extension URL to find
 * @returns {string} HL7 code
 */
function getExtensionValue(extensions, url) {
  if (!extensions || !Array.isArray(extensions)) return ''
  
  const ext = extensions.find(e => e.url === url)
  if (!ext || !ext.valueCodeableConcept) return ''
  
  return ext.valueCodeableConcept.coding?.[0]?.code || ''
}

/**
 * Converts FHIR Identifier to HL7 identifier format
 * @param {Object} identifier - FHIR Identifier object
 * @returns {string} HL7 identifier string (ID^CheckDigit^CheckDigitScheme^AssigningAuthority^IdentifierTypeCode^AssigningFacility)
 */
function convertFHIRIdentifierToHL7(identifier) {
  if (!identifier || !identifier.value) return ''
  
  const parts = []
  
  // ID value
  parts.push(identifier.value || '')
  
  // CheckDigit
  parts.push('')
  
  // CheckDigitScheme
  parts.push('')
  
  // AssigningAuthority (from system)
  let assigningAuthority = ''
  if (identifier.system) {
    // Extract authority from system URL if possible
    const systemParts = identifier.system.split('/')
    assigningAuthority = systemParts[systemParts.length - 1] || ''
    // Clean up common patterns
    assigningAuthority = assigningAuthority.replace(/^http(s)?:\/\//, '').replace(/\/$/, '')
  }
  parts.push(assigningAuthority)
  
  // IdentifierTypeCode (from type)
  let typeCode = ''
  if (identifier.type && identifier.type.coding && identifier.type.coding.length > 0) {
    typeCode = identifier.type.coding[0].code || ''
  } else if (identifier.system) {
    // Infer from system URL
    if (identifier.system.includes('ssn') || identifier.system.includes('us-ssn')) {
      typeCode = 'SS'
    } else if (identifier.system.includes('mrn') || identifier.system.includes('medical-record')) {
      typeCode = 'MR'
    } else if (identifier.system.includes('driver') || identifier.system.includes('dl')) {
      typeCode = 'DL'
    }
  }
  parts.push(typeCode)
  
  // AssigningFacility
  parts.push('')
  
  return parts.join('^')
}

/**
 * Converts FHIR Practitioner reference to HL7 XCN format
 * @param {Object} practitionerRef - FHIR Practitioner resource or reference
 * @returns {string} HL7 XCN string (ID^Family^Given^Middle^Suffix^Prefix^Degree^IDType^AssigningAuthority)
 */
function convertFHIRPractitionerToHL7(practitionerRef) {
  if (!practitionerRef) return ''
  
  // If it's a reference, we can't resolve it, so return empty
  if (practitionerRef.reference) return ''
  
  // If it's a Practitioner resource
  if (practitionerRef.resourceType === 'Practitioner') {
    const parts = []
    
    // ID
    parts.push(practitionerRef.id || '')
    
    // Name
    if (practitionerRef.name && practitionerRef.name.length > 0) {
      const name = practitionerRef.name[0]
      parts.push(name.family || '')
      parts.push(name.given?.[0] || '')
      parts.push(name.given?.length > 1 ? name.given.slice(1).join(' ') : '')
      parts.push(name.suffix?.[0] || '')
      parts.push(name.prefix?.[0] || '')
      parts.push('') // Degree
    } else {
      parts.push('', '', '', '', '', '')
    }
    
    // IDType
    parts.push('')
    
    // AssigningAuthority
    parts.push('')
    
    return parts.join('^')
  }
  
  return ''
}

/**
 * Creates MSH segment for HL7 message
 * @param {string} messageType - Message type (e.g., 'ADT^A01')
 * @param {string} messageControlId - Message control ID
 * @param {Object} options - Optional configuration
 * @returns {string} MSH segment string
 */
function createMSHSegment(messageType = 'ADT^A01', messageControlId = null, options = {}) {
  const now = new Date()
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0]
  const controlId = messageControlId || `MSG${timestamp}${Math.floor(Math.random() * 1000)}`
  
  const fields = [
    'MSH',
    '^~\\&', // Encoding characters
    options.sendingApplication || 'FHIR-HYDRANT', // Sending Application
    options.sendingFacility || 'FHIR-HYDRANT-FACILITY', // Sending Facility
    options.receivingApplication || 'RECEIVING-APP', // Receiving Application
    options.receivingFacility || 'RECEIVING-FACILITY', // Receiving Facility
    timestamp, // Date/Time of Message
    '', // Security
    messageType, // Message Type
    controlId, // Message Control ID
    options.processingId || 'P', // Processing ID (P=Production, T=Test)
    options.versionId || '2.5', // Version ID
    '', // Sequence Number
    '', // Continuation Pointer
    '', // Accept Acknowledgment Type
    '', // Application Acknowledgment Type
    '', // Country Code
    '', // Character Set
    '', // Principal Language of Message
    '', // Alternate Character Set Handling Scheme
  ]
  
  return fields.join('|')
}

/**
 * Converts FHIR Patient resource to HL7 PID segment
 * @param {Object} patient - FHIR Patient resource
 * @returns {string} HL7 PID segment string
 */
function convertPatientToPID(patient) {
  if (!patient || patient.resourceType !== 'Patient') {
    throw new Error('Invalid Patient resource')
  }
  
  const fields = ['PID']
  
  // PID-1: Set ID (always 1 for first patient)
  fields.push('1')
  
  // PID-2: Patient ID (external) - empty
  fields.push('')
  
  // PID-3: Patient Identifier List
  if (patient.identifier && patient.identifier.length > 0) {
    const identifiers = patient.identifier
      .map(id => convertFHIRIdentifierToHL7(id))
      .filter(id => id) // Remove empty identifiers
    fields.push(identifiers.join('~') || '')
  } else {
    fields.push('')
  }
  
  // PID-4: Alternate Patient ID - empty
  fields.push('')
  
  // PID-5: Patient Name
  if (patient.name && patient.name.length > 0) {
    const names = patient.name.map(name => convertFHIRNameToHL7(name))
    fields.push(names.join('~') || '')
  } else {
    fields.push('')
  }
  
  // PID-6: Mother's Maiden Name
  // Look for extension or use empty
  const mothersMaidenName = patient.extension?.find(
    ext => ext.url === 'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
  )
  if (mothersMaidenName?.valueString) {
    fields.push(mothersMaidenName.valueString)
  } else {
    fields.push('')
  }
  
  // PID-7: Date/Time of Birth
  if (patient.birthDate) {
    fields.push(convertFHIRDateTimeToHL7(patient.birthDate))
  } else {
    fields.push('')
  }
  
  // PID-8: Administrative Sex
  fields.push(convertFHIRGenderToHL7(patient.gender))
  
  // PID-9: Patient Alias
  const aliasNames = patient.name?.filter(n => n.use === 'nickname' || n.use === 'usual')
  if (aliasNames && aliasNames.length > 0) {
    const aliases = aliasNames.map(name => convertFHIRNameToHL7(name))
    fields.push(aliases.join('~') || '')
  } else {
    fields.push('')
  }
  
  // PID-10: Race
  const raceExt = patient.extension?.find(
    ext => ext.url === 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
  )
  if (raceExt?.extension) {
    const raceCodes = raceExt.extension
      .filter(e => e.url === 'ombCategory')
      .map(e => e.valueCoding?.code || '')
      .filter(c => c)
    if (raceCodes.length > 0) {
      fields.push(raceCodes.join('~'))
    } else {
      fields.push('')
    }
  } else {
    fields.push('')
  }
  
  // PID-11: Patient Address
  if (patient.address && patient.address.length > 0) {
    const addresses = patient.address.map(addr => convertFHIRAddressToHL7(addr))
    fields.push(addresses.join('~') || '')
  } else {
    fields.push('')
  }
  
  // PID-12: County Code
  const countyCode = patient.address?.[0]?.district
  fields.push(countyCode || '')
  
  // PID-13: Phone Number - Home
  const homePhone = patient.telecom?.find(t => t.system === 'phone' && (t.use === 'home' || !t.use))
  fields.push(homePhone?.value || '')
  
  // PID-14: Phone Number - Business
  const workPhone = patient.telecom?.find(t => t.system === 'phone' && t.use === 'work')
  fields.push(workPhone?.value || '')
  
  // PID-15: Primary Language
  const language = patient.communication?.find(c => c.preferred)?.language?.coding?.[0]?.code
  fields.push(language || '')
  
  // PID-16: Marital Status
  if (patient.maritalStatus) {
    fields.push(convertFHIRMaritalStatusToHL7(patient.maritalStatus))
  } else {
    fields.push('')
  }
  
  // PID-17: Religion
  const religion = patient.extension?.find(
    ext => ext.url === 'http://hl7.org/fhir/StructureDefinition/patient-religion'
  )
  if (religion?.valueCodeableConcept?.coding?.[0]?.code) {
    fields.push(religion.valueCodeableConcept.coding[0].code)
  } else {
    fields.push('')
  }
  
  // PID-18: Patient Account Number
  const accountNumber = patient.identifier?.find(id => 
    id.type?.coding?.some(c => c.code === 'AN' || c.display?.toLowerCase().includes('account'))
  )
  fields.push(accountNumber ? convertFHIRIdentifierToHL7(accountNumber) : '')
  
  // PID-19: SSN Number
  const ssn = patient.identifier?.find(id => 
    id.type?.coding?.some(c => c.code === 'SS') || 
    id.system?.includes('ssn') ||
    id.system?.includes('us-ssn')
  )
  fields.push(ssn ? convertFHIRIdentifierToHL7(ssn) : '')
  
  // PID-20: Driver's License Number
  const dl = patient.identifier?.find(id => 
    id.type?.coding?.some(c => c.code === 'DL') || 
    id.system?.includes('driver') ||
    id.system?.includes('dl')
  )
  if (dl) {
    const dlValue = convertFHIRIdentifierToHL7(dl)
    // Add state and expiration if available
    const state = dl.extension?.find(e => e.url === 'http://hl7.org/fhir/StructureDefinition/identifier-state')?.valueString
    const expiration = dl.period?.end ? convertFHIRDateTimeToHL7(dl.period.end) : ''
    if (state || expiration) {
      fields.push(`${dlValue}^${state || ''}^${expiration || ''}`)
    } else {
      fields.push(dlValue)
    }
  } else {
    fields.push('')
  }
  
  // PID-21: Mother's Identifier - empty
  fields.push('')
  
  // PID-22: Ethnic Group
  const ethnicityExt = patient.extension?.find(
    ext => ext.url === 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity'
  )
  if (ethnicityExt?.extension) {
    const ethnicityCodes = ethnicityExt.extension
      .filter(e => e.url === 'ombCategory')
      .map(e => e.valueCoding?.code || '')
      .filter(c => c)
    if (ethnicityCodes.length > 0) {
      fields.push(ethnicityCodes.join('~'))
    } else {
      fields.push('')
    }
  } else {
    fields.push('')
  }
  
  // PID-23: Birth Place
  const birthPlace = patient.extension?.find(
    ext => ext.url === 'http://hl7.org/fhir/StructureDefinition/birthPlace'
  )
  if (birthPlace?.valueAddress) {
    fields.push(convertFHIRAddressToHL7(birthPlace.valueAddress))
  } else {
    fields.push('')
  }
  
  // PID-24: Multiple Birth Indicator
  if (patient.multipleBirthBoolean !== undefined) {
    fields.push(patient.multipleBirthBoolean ? 'Y' : 'N')
  } else if (patient.multipleBirthInteger) {
    fields.push('Y')
  } else {
    fields.push('')
  }
  
  // PID-25: Birth Order
  if (patient.multipleBirthInteger) {
    fields.push(patient.multipleBirthInteger.toString())
  } else {
    fields.push('')
  }
  
  // PID-26: Citizenship
  const citizenship = patient.extension?.find(
    ext => ext.url === 'http://hl7.org/fhir/StructureDefinition/patient-citizenship'
  )
  if (citizenship?.valueCodeableConcept?.coding?.[0]?.code) {
    fields.push(citizenship.valueCodeableConcept.coding[0].code)
  } else {
    fields.push('')
  }
  
  // PID-27: Veterans Military Status - empty
  fields.push('')
  
  // PID-28: Nationality - empty
  fields.push('')
  
  // PID-29: Patient Death Date and Time
  if (patient.deceasedDateTime) {
    fields.push(convertFHIRDateTimeToHL7(patient.deceasedDateTime))
  } else if (patient.deceasedBoolean === true) {
    // If deceased is true but no date, use current date
    fields.push(convertFHIRDateTimeToHL7(new Date().toISOString()))
  } else {
    fields.push('')
  }
  
  // PID-30: Patient Death Indicator
  if (patient.deceasedBoolean !== undefined) {
    fields.push(patient.deceasedBoolean ? 'Y' : 'N')
  } else if (patient.deceasedDateTime) {
    fields.push('Y')
  } else {
    fields.push('')
  }
  
  return fields.join('|')
}

/**
 * Converts FHIR Encounter resource to HL7 PV1 segment
 * @param {Object} encounter - FHIR Encounter resource
 * @param {Array} practitioners - Array of Practitioner resources for provider references
 * @returns {string} HL7 PV1 segment string
 */
function convertEncounterToPV1(encounter, practitioners = []) {
  if (!encounter || encounter.resourceType !== 'Encounter') {
    return ''
  }
  
  const fields = ['PV1']
  
  // PV1-1: Set ID (always 1)
  fields.push('1')
  
  // PV1-2: Patient Class
  let patientClass = 'I' // Default to Inpatient
  if (encounter.class) {
    const classCode = encounter.class.code
    const classMapping = {
      'IMP': 'I', // Inpatient
      'AMB': 'O', // Outpatient
      'EMER': 'E', // Emergency
      'PRENC': 'P', // Pre-admission
      'OBSENC': 'O', // Observation encounter
      'NONAC': 'N', // Non-acute inpatient
      'SS': 'S', // Short stay
    }
    patientClass = classMapping[classCode] || 'I'
  }
  fields.push(patientClass)
  
  // PV1-3: Assigned Patient Location
  if (encounter.location && encounter.location.length > 0) {
    const location = encounter.location[0]
    // Location format: PointOfCare^Room^Bed^Facility^LocationStatus^PersonLocationType^Building^Floor^LocationDescription
    let locationStr = ''
    if (location.location?.display) {
      // Try to parse if already in HL7 format
      if (location.location.display.includes('^')) {
        locationStr = location.location.display
      } else {
        // Simple format: just the display name
        locationStr = location.location.display
      }
    } else if (location.location?.identifier?.value) {
      locationStr = location.location.identifier.value
    }
    fields.push(locationStr || '')
  } else {
    fields.push('')
  }
  
  // PV1-4: Admission Type
  const admissionType = encounter.hospitalization?.admitSource?.coding?.[0]?.code
  // Map FHIR admit source to HL7 admission type
  const admissionTypeMapping = {
    'hosp-trans': 'TR', // Transfer from hospital
    'emd': 'E', // Emergency department
    'outp': 'O', // Outpatient
    'born': 'NB', // Newborn
    'gp': 'GP', // General practitioner
  }
  fields.push(admissionTypeMapping[admissionType] || '')
  
  // PV1-5: Preadmit Number
  const preadmitNumber = encounter.identifier?.find(id => 
    id.type?.coding?.some(c => c.code === 'VN' || c.display?.toLowerCase().includes('preadmit'))
  )
  fields.push(preadmitNumber?.value || '')
  
  // PV1-6: Prior Patient Location
  const priorLocation = encounter.hospitalization?.preAdmissionIdentifier?.value
  fields.push(priorLocation || '')
  
  // PV1-7: Attending Doctor
  const attendingDoctor = encounter.participant?.find(p => 
    p.type?.some(t => t.coding?.some(c => c.code === 'ATND'))
  )
  if (attendingDoctor) {
    const practitioner = practitioners.find(p => 
      p.id === attendingDoctor.individual?.reference?.split('/')[1] ||
      p.resourceType === 'Practitioner' && attendingDoctor.individual?.reference?.includes(p.id)
    ) || attendingDoctor.individual
    fields.push(convertFHIRPractitionerToHL7(practitioner))
  } else {
    fields.push('')
  }
  
  // PV1-8: Referring Doctor
  const referringDoctor = encounter.participant?.find(p => 
    p.type?.some(t => t.coding?.some(c => c.code === 'REF'))
  )
  if (referringDoctor) {
    const practitioner = practitioners.find(p => 
      p.id === referringDoctor.individual?.reference?.split('/')[1] ||
      p.resourceType === 'Practitioner' && referringDoctor.individual?.reference?.includes(p.id)
    ) || referringDoctor.individual
    fields.push(convertFHIRPractitionerToHL7(practitioner))
  } else {
    fields.push('')
  }
  
  // PV1-9: Consulting Doctor
  const consultingDoctors = encounter.participant?.filter(p => 
    p.type?.some(t => t.coding?.some(c => c.code === 'CON'))
  )
  if (consultingDoctors && consultingDoctors.length > 0) {
    const doctors = consultingDoctors.map(doc => {
      const practitioner = practitioners.find(p => 
        p.id === doc.individual?.reference?.split('/')[1] ||
        p.resourceType === 'Practitioner' && doc.individual?.reference?.includes(p.id)
      ) || doc.individual
      return convertFHIRPractitionerToHL7(practitioner)
    }).filter(d => d)
    fields.push(doctors.join('~') || '')
  } else {
    fields.push('')
  }
  
  // PV1-10: Hospital Service
  const serviceType = encounter.type?.[0]?.coding?.[0]?.code
  fields.push(serviceType || '')
  
  // PV1-11: Temporary Location - empty
  fields.push('')
  
  // PV1-12: Preadmit Test Indicator - empty
  fields.push('')
  
  // PV1-13: Re-admission Indicator
  const readmissionIndicator = encounter.hospitalization?.reAdmission?.coding?.[0]?.code
  fields.push(readmissionIndicator || '')
  
  // PV1-14: Admit Source
  const admitSource = encounter.hospitalization?.admitSource?.coding?.[0]?.code
  fields.push(admitSource || '')
  
  // PV1-15: Ambulatory Status - empty
  fields.push('')
  
  // PV1-16: VIP Indicator - empty
  fields.push('')
  
  // PV1-17: Admitting Doctor
  const admittingDoctor = encounter.participant?.find(p => 
    p.type?.some(t => t.coding?.some(c => c.code === 'ADM'))
  )
  if (admittingDoctor) {
    const practitioner = practitioners.find(p => 
      p.id === admittingDoctor.individual?.reference?.split('/')[1] ||
      p.resourceType === 'Practitioner' && admittingDoctor.individual?.reference?.includes(p.id)
    ) || admittingDoctor.individual
    fields.push(convertFHIRPractitionerToHL7(practitioner))
  } else {
    fields.push('')
  }
  
  // PV1-18: Patient Type - empty
  fields.push('')
  
  // PV1-19: Visit Number
  const visitNumber = encounter.identifier?.find(id => 
    id.type?.coding?.some(c => c.code === 'VN' || c.display?.toLowerCase().includes('visit'))
  )
  fields.push(visitNumber ? convertFHIRIdentifierToHL7(visitNumber) : '')
  
  // PV1-20: Financial Class
  const financialClass = encounter.classHistory?.[0]?.class?.code
  fields.push(financialClass || '')
  
  // PV1-21: Charge Price Indicator - empty
  fields.push('')
  
  // PV1-22: Courtesy Code - empty
  fields.push('')
  
  // PV1-23: Credit Rating - empty
  fields.push('')
  
  // PV1-24: Contract Code - empty
  fields.push('')
  
  // PV1-25: Contract Effective Date - empty
  fields.push('')
  
  // PV1-26: Contract Amount - empty
  fields.push('')
  
  // PV1-27: Contract Period - empty
  fields.push('')
  
  // PV1-28: Interest Code - empty
  fields.push('')
  
  // PV1-29: Transfer to Bad Debt Code - empty
  fields.push('')
  
  // PV1-30: Transfer to Bad Debt Date - empty
  fields.push('')
  
  // PV1-31: Bad Debt Agency Code - empty
  fields.push('')
  
  // PV1-32: Bad Debt Transfer Amount - empty
  fields.push('')
  
  // PV1-33: Bad Debt Recovery Amount - empty
  fields.push('')
  
  // PV1-34: Delete Account Indicator - empty
  fields.push('')
  
  // PV1-35: Delete Account Date - empty
  fields.push('')
  
  // PV1-36: Discharge Disposition
  const dischargeDisposition = encounter.hospitalization?.dischargeDisposition?.coding?.[0]?.code
  fields.push(dischargeDisposition || '')
  
  // PV1-37: Discharged to Location - empty
  fields.push('')
  
  // PV1-38: Diet Type - empty
  fields.push('')
  
  // PV1-39: Servicing Facility - empty
  fields.push('')
  
  // PV1-40: Bed Status
  const bedStatus = encounter.location?.[0]?.status
  // Map FHIR location status to HL7 bed status
  const bedStatusMapping = {
    'active': 'O', // Occupied
    'reserved': 'R', // Reserved
    'inactive': 'C', // Closed
  }
  fields.push(bedStatusMapping[bedStatus] || '')
  
  // PV1-41: Account Status - empty
  fields.push('')
  
  // PV1-42: Pending Location - empty
  fields.push('')
  
  // PV1-43: Prior Temporary Location - empty
  fields.push('')
  
  // PV1-44: Admit Date/Time
  if (encounter.period && encounter.period.start) {
    fields.push(convertFHIRDateTimeToHL7(encounter.period.start))
  } else {
    fields.push('')
  }
  
  // PV1-45: Discharge Date/Time
  if (encounter.period && encounter.period.end) {
    fields.push(convertFHIRDateTimeToHL7(encounter.period.end))
  } else {
    fields.push('')
  }
  
  // PV1-46: Current Patient Balance - empty
  fields.push('')
  
  // PV1-47: Total Charges - empty
  fields.push('')
  
  // PV1-48: Total Adjustments - empty
  fields.push('')
  
  // PV1-49: Total Payments - empty
  fields.push('')
  
  // PV1-50: Alternate Visit ID
  const altVisitId = encounter.identifier?.find(id => 
    id.use === 'secondary' || id.type?.coding?.some(c => c.code === 'VN')
  )
  fields.push(altVisitId ? convertFHIRIdentifierToHL7(altVisitId) : '')
  
  return fields.join('|')
}

/**
 * Converts FHIR RelatedPerson resource to HL7 NK1 segment
 * @param {Object} relatedPerson - FHIR RelatedPerson resource
 * @param {number} setId - Set ID for this NK1 segment
 * @returns {string} HL7 NK1 segment string
 */
function convertRelatedPersonToNK1(relatedPerson, setId = 1) {
  if (!relatedPerson || relatedPerson.resourceType !== 'RelatedPerson') {
    return ''
  }
  
  const fields = ['NK1']
  
  // NK1-1: Set ID
  fields.push(setId.toString())
  
  // NK1-2: Name
  if (relatedPerson.name && relatedPerson.name.length > 0) {
    const names = relatedPerson.name.map(name => convertFHIRNameToHL7(name))
    fields.push(names.join('~') || '')
  } else {
    fields.push('')
  }
  
  // NK1-3: Relationship
  if (relatedPerson.relationship && relatedPerson.relationship.length > 0) {
    const relationship = relatedPerson.relationship[0]
    // Format: Code^Text^CodingSystem
    const code = relationship.coding?.[0]?.code || ''
    const display = relationship.coding?.[0]?.display || relationship.text || ''
    const system = relationship.coding?.[0]?.system || ''
    fields.push(`${code}^${display}^${system}`)
  } else {
    fields.push('')
  }
  
  // NK1-4: Address
  if (relatedPerson.address && relatedPerson.address.length > 0) {
    const addresses = relatedPerson.address.map(addr => convertFHIRAddressToHL7(addr))
    fields.push(addresses.join('~') || '')
  } else {
    fields.push('')
  }
  
  // NK1-5: Phone Number
  const homePhone = relatedPerson.telecom?.find(t => t.system === 'phone' && (t.use === 'home' || !t.use))
  fields.push(homePhone?.value || '')
  
  // NK1-6: Business Phone Number
  const workPhone = relatedPerson.telecom?.find(t => t.system === 'phone' && t.use === 'work')
  fields.push(workPhone?.value || '')
  
  // NK1-7: Contact Role - empty
  fields.push('')
  
  // NK1-8: Start Date
  if (relatedPerson.period && relatedPerson.period.start) {
    fields.push(convertFHIRDateTimeToHL7(relatedPerson.period.start))
  } else {
    fields.push('')
  }
  
  // NK1-9: End Date
  if (relatedPerson.period && relatedPerson.period.end) {
    fields.push(convertFHIRDateTimeToHL7(relatedPerson.period.end))
  } else {
    fields.push('')
  }
  
  // NK1-10: Next of Kin / Associated Parties Job Title - empty
  fields.push('')
  
  // NK1-11: Next of Kin / Associated Parties Job Code/Class - empty
  fields.push('')
  
  // NK1-12: Next of Kin / Associated Parties Employee Number - empty
  fields.push('')
  
  // NK1-13: Organization Name - empty
  fields.push('')
  
  // Continue with remaining fields (14-31) - empty for now
  for (let i = 14; i <= 31; i++) {
    fields.push('')
  }
  
  return fields.join('|')
}

/**
 * Converts FHIR Observation resource to HL7 OBX segment
 * @param {Object} observation - FHIR Observation resource
 * @param {number} setId - Set ID for this OBX segment
 * @returns {string} HL7 OBX segment string
 */
function convertObservationToOBX(observation, setId = 1) {
  if (!observation || observation.resourceType !== 'Observation') {
    return ''
  }
  
  const fields = ['OBX']
  
  // OBX-1: Set ID
  fields.push(setId.toString())
  
  // OBX-2: Value Type
  let valueType = 'ST' // Default to string
  if (observation.valueQuantity) {
    valueType = 'NM' // Numeric
  } else if (observation.valueCodeableConcept) {
    valueType = 'CE' // Coded Entry
  } else if (observation.valueDateTime || observation.valueDate) {
    valueType = 'DT' // Date
  } else if (observation.valueTime) {
    valueType = 'TM' // Time
  } else if (observation.valueString) {
    valueType = 'ST' // String
  } else if (observation.valueBoolean !== undefined) {
    valueType = 'ST' // String (for boolean)
  }
  fields.push(valueType)
  
  // OBX-3: Observation Identifier
  if (observation.code && observation.code.coding && observation.code.coding.length > 0) {
    const coding = observation.code.coding[0]
    // Format: Identifier^Text^NameOfCodingSystem
    const code = coding.code || ''
    const display = coding.display || observation.code.text || ''
    const system = coding.system || ''
    fields.push(`${code}^${display}^${system}`)
  } else {
    fields.push('')
  }
  
  // OBX-4: Observation Sub-ID - empty
  fields.push('')
  
  // OBX-5: Observation Value
  let value = ''
  if (observation.valueQuantity) {
    value = observation.valueQuantity.value?.toString() || ''
  } else if (observation.valueCodeableConcept) {
    const coding = observation.valueCodeableConcept.coding?.[0]
    value = coding?.code || observation.valueCodeableConcept.text || ''
  } else if (observation.valueDateTime) {
    value = convertFHIRDateTimeToHL7(observation.valueDateTime)
  } else if (observation.valueDate) {
    value = convertFHIRDateTimeToHL7(observation.valueDate)
  } else if (observation.valueTime) {
    value = observation.valueTime
  } else if (observation.valueString) {
    value = observation.valueString
  } else if (observation.valueBoolean !== undefined) {
    value = observation.valueBoolean ? 'Y' : 'N'
  }
  fields.push(value)
  
  // OBX-6: Units
  if (observation.valueQuantity && observation.valueQuantity.unit) {
    // Format: Units^UnitsText^UnitsCodingSystem
    const unit = observation.valueQuantity.unit || ''
    const system = observation.valueQuantity.system || 'http://unitsofmeasure.org'
    const code = observation.valueQuantity.code || ''
    fields.push(`${unit}^${unit}^${system}^${code}`)
  } else {
    fields.push('')
  }
  
  // OBX-7: References Range - empty
  fields.push('')
  
  // OBX-8: Abnormal Flags
  const interpretation = observation.interpretation?.[0]?.coding?.[0]?.code
  // Map FHIR interpretation to HL7 abnormal flags
  const flagMapping = {
    'L': 'L', // Low
    'LL': 'LL', // Critical Low
    'H': 'H', // High
    'HH': 'HH', // Critical High
    'N': 'N', // Normal
    'A': 'A', // Abnormal
  }
  fields.push(flagMapping[interpretation] || '')
  
  // OBX-9: Probability - empty
  fields.push('')
  
  // OBX-10: Nature of Abnormal Test - empty
  fields.push('')
  
  // OBX-11: Observation Result Status
  const statusMapping = {
    'registered': 'I', // Intermediate
    'preliminary': 'P', // Preliminary
    'final': 'F', // Final
    'amended': 'C', // Corrected
    'corrected': 'C', // Corrected
    'cancelled': 'X', // Cancelled
    'entered-in-error': 'E', // Error
    'unknown': 'U', // Unknown
  }
  fields.push(statusMapping[observation.status] || 'F')
  
  // OBX-12: Date/Time of the Observation
  if (observation.effectiveDateTime) {
    fields.push(convertFHIRDateTimeToHL7(observation.effectiveDateTime))
  } else if (observation.effectivePeriod?.start) {
    fields.push(convertFHIRDateTimeToHL7(observation.effectivePeriod.start))
  } else {
    fields.push('')
  }
  
  // OBX-13: Producer's ID - empty
  fields.push('')
  
  // OBX-14: Responsible Observer - empty
  fields.push('')
  
  // OBX-15: Observation Method - empty
  fields.push('')
  
  // OBX-16: Equipment Instance Identifier - empty
  fields.push('')
  
  // OBX-17: Date/Time of the Analysis - empty
  fields.push('')
  
  return fields.join('|')
}

/**
 * Converts FHIR AllergyIntolerance resource to HL7 AL1 segment
 * @param {Object} allergy - FHIR AllergyIntolerance resource
 * @param {number} setId - Set ID for this AL1 segment
 * @returns {string} HL7 AL1 segment string
 */
function convertAllergyIntoleranceToAL1(allergy, setId = 1) {
  if (!allergy || allergy.resourceType !== 'AllergyIntolerance') {
    return ''
  }
  
  const fields = ['AL1']
  
  // AL1-1: Set ID
  fields.push(setId.toString())
  
  // AL1-2: Allergen Type Code
  const typeMapping = {
    'allergy': 'DA', // Drug allergy
    'intolerance': 'FA', // Food allergy
    'environment': 'EA', // Environmental allergy
    'biologic': 'MA', // Miscellaneous allergy
  }
  const type = allergy.type || 'allergy'
  fields.push(typeMapping[type] || 'MA')
  
  // AL1-3: Allergen Code/Mnemonic/Description
  if (allergy.code && allergy.code.coding && allergy.code.coding.length > 0) {
    const coding = allergy.code.coding[0]
    // Format: Code^Text^CodingSystem
    const code = coding.code || ''
    const display = coding.display || allergy.code.text || ''
    const system = coding.system || ''
    fields.push(`${code}^${display}^${system}`)
  } else {
    fields.push('')
  }
  
  // AL1-4: Allergy Severity Code
  const severityMapping = {
    'mild': 'MI', // Mild
    'moderate': 'MO', // Moderate
    'severe': 'SV', // Severe
  }
  const severity = allergy.reaction?.[0]?.severity
  fields.push(severityMapping[severity] || '')
  
  // AL1-5: Allergy Reaction Code
  if (allergy.reaction && allergy.reaction.length > 0) {
    const reactions = allergy.reaction.map(r => {
      if (r.manifestation && r.manifestation.length > 0) {
        const manifestation = r.manifestation[0]
        const code = manifestation.coding?.[0]?.code || ''
        const display = manifestation.coding?.[0]?.display || manifestation.text || ''
        return `${code}^${display}`
      }
      return ''
    }).filter(r => r)
    fields.push(reactions.join('~') || '')
  } else {
    fields.push('')
  }
  
  // AL1-6: Identification Date
  if (allergy.onsetDateTime) {
    fields.push(convertFHIRDateTimeToHL7(allergy.onsetDateTime))
  } else if (allergy.recordedDate) {
    fields.push(convertFHIRDateTimeToHL7(allergy.recordedDate))
  } else {
    fields.push('')
  }
  
  return fields.join('|')
}

/**
 * Converts FHIR Condition resource to HL7 DG1 segment
 * @param {Object} condition - FHIR Condition resource
 * @param {number} setId - Set ID for this DG1 segment
 * @returns {string} HL7 DG1 segment string
 */
function convertConditionToDG1(condition, setId = 1) {
  if (!condition || condition.resourceType !== 'Condition') {
    return ''
  }
  
  const fields = ['DG1']
  
  // DG1-1: Set ID
  fields.push(setId.toString())
  
  // DG1-2: Diagnosis Coding Method - empty (usually ICD-10)
  fields.push('')
  
  // DG1-3: Diagnosis Code
  if (condition.code && condition.code.coding && condition.code.coding.length > 0) {
    const coding = condition.code.coding[0]
    // Format: Identifier^Text^NameOfCodingSystem
    const code = coding.code || ''
    const display = coding.display || condition.code.text || ''
    const system = coding.system || ''
    fields.push(`${code}^${display}^${system}`)
  } else {
    fields.push('')
  }
  
  // DG1-4: Diagnosis Description
  if (condition.code?.text) {
    fields.push(condition.code.text)
  } else {
    fields.push('')
  }
  
  // DG1-5: Diagnosis Date/Time
  if (condition.onsetDateTime) {
    fields.push(convertFHIRDateTimeToHL7(condition.onsetDateTime))
  } else if (condition.recordedDate) {
    fields.push(convertFHIRDateTimeToHL7(condition.recordedDate))
  } else {
    fields.push('')
  }
  
  // DG1-6: Diagnosis Type
  const category = condition.category?.[0]?.coding?.[0]?.code
  const typeMapping = {
    'encounter-diagnosis': 'A', // Admitting
    'problem-list-item': 'F', // Final
    'health-concern': 'W', // Working
  }
  fields.push(typeMapping[category] || 'F')
  
  // DG1-7: Major Diagnostic Category - empty
  fields.push('')
  
  // DG1-8: Diagnostic Related Group - empty
  fields.push('')
  
  // DG1-9: DRG Approval Indicator - empty
  fields.push('')
  
  // DG1-10: DRG Grouper Review Code - empty
  fields.push('')
  
  // DG1-11: Outlier Type - empty
  fields.push('')
  
  // DG1-12: Outlier Days - empty
  fields.push('')
  
  // DG1-13: Outlier Cost - empty
  fields.push('')
  
  // DG1-14: Grouper Version And Type - empty
  fields.push('')
  
  // DG1-15: Diagnosis Priority - empty
  fields.push('')
  
  // DG1-16: Diagnosing Clinician
  if (condition.asserter) {
    // If it's a reference, we can't resolve it
    if (condition.asserter.reference) {
      fields.push('')
    } else if (condition.asserter.resourceType === 'Practitioner') {
      fields.push(convertFHIRPractitionerToHL7(condition.asserter))
    } else {
      fields.push('')
    }
  } else {
    fields.push('')
  }
  
  // DG1-17: Diagnosis Classification - empty
  fields.push('')
  
  // DG1-18: Confidential Indicator - empty
  fields.push('')
  
  // DG1-19: Attestation Date/Time - empty
  fields.push('')
  
  // DG1-20: Diagnosis Identifier - empty
  fields.push('')
  
  // DG1-21: Diagnosis Action Code - empty
  fields.push('')
  
  return fields.join('|')
}

/**
 * Creates EVN segment for HL7 message
 * @param {string} eventType - Event type code (e.g., 'A01')
 * @param {string} recordedDateTime - Optional recorded date/time
 * @returns {string} EVN segment string
 */
function createEVNSegment(eventType = 'A01', recordedDateTime = null) {
  const now = new Date()
  const timestamp = recordedDateTime 
    ? convertFHIRDateTimeToHL7(recordedDateTime)
    : now.toISOString().replace(/[-:]/g, '').split('.')[0]
  
  const fields = [
    'EVN',
    eventType, // Event Type Code
    timestamp, // Recorded Date/Time
    '', // Date/Time Planned Event
    '', // Event Reason Code
    'SendingUserID', // Operator ID
    '', // Event Occurred
    '', // Event Facility
  ]
  
  return fields.join('|')
}

/**
 * Determines HL7 message type based on resources
 * @param {Object} encounter - FHIR Encounter resource (optional)
 * @returns {Object} Object with messageType and eventType
 */
function determineMessageType(encounter) {
  if (!encounter) {
    return { messageType: 'ADT^A08', eventType: 'A08' } // Patient Update
  }
  
  const status = encounter.status
  const classCode = encounter.class?.code
  
  // Based on encounter status
  switch (status) {
    case 'planned':
      return { messageType: 'ADT^A04', eventType: 'A04' } // Patient Register
    case 'arrived':
    case 'in-progress':
      return { messageType: 'ADT^A01', eventType: 'A01' } // Patient Admit
    case 'finished':
    case 'cancelled':
      return { messageType: 'ADT^A03', eventType: 'A03' } // Patient Discharge
    case 'onleave':
      return { messageType: 'ADT^A14', eventType: 'A14' } // Pending Admit
    default:
      // Default based on class
      if (classCode === 'IMP') {
        return { messageType: 'ADT^A01', eventType: 'A01' } // Patient Admit
      } else {
        return { messageType: 'ADT^A08', eventType: 'A08' } // Patient Update
      }
  }
}

/**
 * Converts FHIR resource(s) to HL7 message
 * @param {Object|Array|Object} fhirResource - FHIR resource, array of resources, or Bundle
 * @param {Object} options - Optional configuration for MSH segment
 * @returns {string} HL7 message string
 */
export function convertFHIRToHL7(fhirResource, options = {}) {
  if (!fhirResource) {
    throw new Error('FHIR resource is required')
  }
  
  // Handle Bundle
  let resources = []
  if (fhirResource.resourceType === 'Bundle' && fhirResource.entry) {
    resources = fhirResource.entry.map(entry => entry.resource).filter(Boolean)
  } else if (Array.isArray(fhirResource)) {
    resources = fhirResource
  } else {
    resources = [fhirResource]
  }
  
  // Find Patient resource
  const patient = resources.find(r => r.resourceType === 'Patient')
  if (!patient) {
    throw new Error('Patient resource is required for HL7 conversion')
  }
  
  // Find other resources
  const encounter = resources.find(r => r.resourceType === 'Encounter')
  const relatedPersons = resources.filter(r => r.resourceType === 'RelatedPerson')
  const observations = resources.filter(r => r.resourceType === 'Observation')
  const allergies = resources.filter(r => r.resourceType === 'AllergyIntolerance')
  const conditions = resources.filter(r => r.resourceType === 'Condition')
  const practitioners = resources.filter(r => r.resourceType === 'Practitioner')
  
  // Determine message type
  const { messageType, eventType } = determineMessageType(encounter)
  
  // Build HL7 message
  const segments = []
  
  // MSH segment
  segments.push(createMSHSegment(messageType, null, options))
  
  // EVN segment
  const recordedDateTime = encounter?.period?.start || patient.meta?.lastUpdated
  segments.push(createEVNSegment(eventType, recordedDateTime))
  
  // PID segment
  segments.push(convertPatientToPID(patient))
  
  // PV1 segment (if encounter exists)
  if (encounter) {
    const pv1Segment = convertEncounterToPV1(encounter, practitioners)
    if (pv1Segment) {
      segments.push(pv1Segment)
    }
  }
  
  // NK1 segments (RelatedPerson)
  relatedPersons.forEach((relatedPerson, index) => {
    const nk1Segment = convertRelatedPersonToNK1(relatedPerson, index + 1)
    if (nk1Segment) {
      segments.push(nk1Segment)
    }
  })
  
  // AL1 segments (AllergyIntolerance)
  allergies.forEach((allergy, index) => {
    const al1Segment = convertAllergyIntoleranceToAL1(allergy, index + 1)
    if (al1Segment) {
      segments.push(al1Segment)
    }
  })
  
  // DG1 segments (Condition/Diagnosis)
  conditions.forEach((condition, index) => {
    const dg1Segment = convertConditionToDG1(condition, index + 1)
    if (dg1Segment) {
      segments.push(dg1Segment)
    }
  })
  
  // OBX segments (Observation)
  observations.forEach((observation, index) => {
    const obxSegment = convertObservationToOBX(observation, index + 1)
    if (obxSegment) {
      segments.push(obxSegment)
    }
  })
  
  return segments.join('\r')
}

/**
 * Gets a sample FHIR Patient resource for testing
 * @returns {Object} Sample FHIR Patient resource
 */
export function getSampleFHIRPatient() {
  return {
    resourceType: 'Patient',
    id: 'patient-1',
    meta: {
      profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'],
    },
    identifier: [
      {
        use: 'usual',
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: 'MR',
              display: 'Medical Record Number',
            },
          ],
        },
        system: 'http://hospital.org/mrn',
        value: 'MRN123456789',
      },
      {
        use: 'official',
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: 'SS',
              display: 'Social Security Number',
            },
          ],
        },
        system: 'http://hl7.org/fhir/sid/us-ssn',
        value: '123-45-6789',
      },
    ],
    name: [
      {
        use: 'official',
        family: 'DOE',
        given: ['JOHN', 'MIDDLE'],
        suffix: ['JR'],
        prefix: ['MR'],
      },
    ],
    telecom: [
      {
        system: 'phone',
        value: '555-123-4567',
        use: 'home',
      },
      {
        system: 'phone',
        value: '555-987-6543',
        use: 'work',
      },
    ],
    gender: 'male',
    birthDate: '1980-01-15',
    address: [
      {
        use: 'home',
        line: ['123 MAIN ST'],
        city: 'CITY',
        state: 'ST',
        postalCode: '12345',
        country: 'USA',
      },
    ],
  }
}

/**
 * Gets a sample FHIR Bundle with Patient and Encounter
 * @returns {Object} Sample FHIR Bundle
 */
export function getSampleFHIRBundle() {
  return {
    resourceType: 'Bundle',
    type: 'collection',
    entry: [
      {
        fullUrl: 'urn:uuid:patient-1',
        resource: {
          ...getSampleFHIRPatient(),
          extension: [
            {
              url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race',
              extension: [
                {
                  url: 'ombCategory',
                  valueCoding: {
                    system: 'urn:oid:2.16.840.1.113883.6.238',
                    code: '2106-3',
                    display: 'White',
                  },
                },
              ],
            },
            {
              url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity',
              extension: [
                {
                  url: 'ombCategory',
                  valueCoding: {
                    system: 'urn:oid:2.16.840.1.113883.6.238',
                    code: '2186-5',
                    display: 'Not Hispanic or Latino',
                  },
                },
              ],
            },
          ],
          maritalStatus: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
                code: 'M',
                display: 'Married',
              },
            ],
          },
        },
      },
      {
        fullUrl: 'urn:uuid:encounter-1',
        resource: {
          resourceType: 'Encounter',
          id: 'encounter-1',
          status: 'in-progress',
          class: {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            code: 'IMP',
            display: 'inpatient encounter',
          },
          subject: {
            reference: 'Patient/patient-1',
          },
          period: {
            start: '2024-01-01T10:00:00',
          },
          location: [
            {
              location: {
                display: 'ICU^101^A',
              },
              status: 'active',
            },
          ],
          hospitalization: {
            admitSource: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/admit-source',
                  code: 'emd',
                  display: 'Emergency Department',
                },
              ],
            },
          },
          identifier: [
            {
              type: {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                    code: 'VN',
                    display: 'Visit Number',
                  },
                ],
              },
              value: 'VN123456789',
            },
          ],
        },
      },
      {
        fullUrl: 'urn:uuid:relatedperson-1',
        resource: {
          resourceType: 'RelatedPerson',
          id: 'relatedperson-1',
          patient: {
            reference: 'Patient/patient-1',
          },
          relationship: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
                  code: 'WIFE',
                  display: 'wife',
                },
              ],
            },
          ],
          name: [
            {
              family: 'DOE',
              given: ['JANE'],
            },
          ],
          telecom: [
            {
              system: 'phone',
              value: '555-111-2222',
              use: 'home',
            },
          ],
          address: [
            {
              use: 'home',
              line: ['123 MAIN ST'],
              city: 'CITY',
              state: 'ST',
              postalCode: '12345',
              country: 'USA',
            },
          ],
        },
      },
      {
        fullUrl: 'urn:uuid:observation-1',
        resource: {
          resourceType: 'Observation',
          id: 'observation-1',
          status: 'final',
          subject: {
            reference: 'Patient/patient-1',
          },
          encounter: {
            reference: 'Encounter/encounter-1',
          },
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '8867-4',
                display: 'Heart rate',
              },
            ],
          },
          valueQuantity: {
            value: 72,
            unit: '/min',
            system: 'http://unitsofmeasure.org',
            code: '/min',
          },
          effectiveDateTime: '2024-01-01T10:30:00',
        },
      },
      {
        fullUrl: 'urn:uuid:allergy-1',
        resource: {
          resourceType: 'AllergyIntolerance',
          id: 'allergy-1',
          patient: {
            reference: 'Patient/patient-1',
          },
          type: 'allergy',
          category: ['medication'],
          code: {
            coding: [
              {
                system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
                code: '7980',
                display: 'Penicillin',
              },
            ],
          },
          severity: 'severe',
          reaction: [
            {
              manifestation: [
                {
                  coding: [
                    {
                      system: 'http://snomed.info/sct',
                      code: '39579001',
                      display: 'Anaphylaxis',
                    },
                  ],
                },
              ],
            },
          ],
          recordedDate: '2020-01-15',
        },
      },
      {
        fullUrl: 'urn:uuid:condition-1',
        resource: {
          resourceType: 'Condition',
          id: 'condition-1',
          subject: {
            reference: 'Patient/patient-1',
          },
          encounter: {
            reference: 'Encounter/encounter-1',
          },
          category: [
            {
              coding: [
                {
                  system: 'http://snomed.info/sct',
                  code: 'encounter-diagnosis',
                  display: 'Encounter Diagnosis',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://hl7.org/fhir/sid/icd-10-cm',
                code: 'I10',
                display: 'Essential (primary) hypertension',
              },
            ],
          },
          onsetDateTime: '2023-06-01',
        },
      },
    ],
  }
}

/**
 * Validates that a resource is a valid FHIR resource
 * @param {Object} resource - Resource to validate
 * @returns {boolean} True if resource appears valid
 */
export function validateFHIRResource(resource) {
  if (!resource || typeof resource !== 'object') {
    return false
  }
  
  // Check for resourceType (required in all FHIR resources)
  if (!resource.resourceType || typeof resource.resourceType !== 'string') {
    return false
  }
  
  // Basic structure check
  return true
}
